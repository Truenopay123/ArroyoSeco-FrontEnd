import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import * as faceapi from 'face-api.js';

export interface LivenessResult {
  isLive: boolean;
  reason?: string;
}

/**
 * Servicio de autenticación facial.
 * Carga modelos de face-api.js, captura descriptores desde webcam,
 * los compara localmente contra el descriptor almacenado
 * y ejecuta detección de vida (anti-spoofing).
 */
@Injectable({ providedIn: 'root' })
export class FaceAuthService {
  private readonly api = inject(ApiService);
  private modelsLoaded = false;

  // Umbral de distancia euclidiana para considerar coincidencia facial
  private readonly MATCH_THRESHOLD = 0.65;

  // ── Parámetros de liveness ───────────────────────────────────────────
  /** Umbral EAR para considerar que un ojo está cerrado */
  private readonly EAR_BLINK_THRESHOLD = 0.25;
  /** Mínimo de parpadeos requeridos */
  private readonly MIN_BLINKS = 1;
  /** Mínimo de movimiento de nariz (px) entre frames para considerar movimiento real */
  private readonly MIN_MOVEMENT_PX = 2;
  /** Duración total del análisis de liveness (ms) */
  private readonly LIVENESS_DURATION_MS = 6000;
  /** Intervalo entre capturas de frames (ms) */
  private readonly FRAME_INTERVAL_MS = 100;

  /**
   * Carga los modelos de face-api.js desde /assets/face-models/.
   * Solo los carga una vez; las llamadas subsecuentes no hacen nada.
   */
  async loadModels(): Promise<void> {
    if (this.modelsLoaded) return;

    const modelUrl = '/assets/face-models';
    await Promise.all([
      faceapi.nets.ssdMobilenetv1.loadFromUri(modelUrl),
      faceapi.nets.faceLandmark68Net.loadFromUri(modelUrl),
      faceapi.nets.faceRecognitionNet.loadFromUri(modelUrl),
    ]);
    this.modelsLoaded = true;
  }

  /**
   * Obtiene el descriptor facial (Float32Array de 128 valores) desde un elemento
   * HTMLVideoElement (webcam). Retorna null si no detecta rostro.
   */
  async getDescriptor(video: HTMLVideoElement): Promise<Float32Array | null> {
    const detection = await faceapi
      .detectSingleFace(video)
      .withFaceLandmarks()
      .withFaceDescriptor();

    return detection?.descriptor ?? null;
  }

  /**
   * Compara dos descriptores faciales usando distancia euclidiana.
   * Retorna true si la distancia está por debajo del umbral.
   */
  comparar(descriptorA: Float32Array, descriptorB: Float32Array): boolean {
    const distance = faceapi.euclideanDistance(
      Array.from(descriptorA),
      Array.from(descriptorB)
    );
    console.log('[FaceAuth Comparación] distancia:', distance.toFixed(4), '| umbral:', this.MATCH_THRESHOLD, '| coincide:', distance < this.MATCH_THRESHOLD);
    return distance < this.MATCH_THRESHOLD;
  }

  // ── Detección de vida (anti-spoofing) ────────────────────────────────

  /**
   * Ejecuta detección de vida durante LIVENESS_DURATION_MS.
   * Analiza múltiples frames buscando parpadeos (EAR) y micro-movimiento.
   * Una foto estática no puede parpadear ni tiene micro-movimiento natural.
   *
   * @param video  HTMLVideoElement con la webcam activa
   * @param onProgress callback opcional con progreso 0-100 y mensaje
   */
  async detectLiveness(
    video: HTMLVideoElement,
    onProgress?: (pct: number, msg: string) => void
  ): Promise<LivenessResult> {
    let blinks = 0;
    let wasEyeClosed = false;
    const nosePositions: { x: number; y: number }[] = [];
    const earValues: number[] = [];
    let framesWithFace = 0;
    const totalFrames = Math.floor(this.LIVENESS_DURATION_MS / this.FRAME_INTERVAL_MS);

    for (let i = 0; i < totalFrames; i++) {
      const pct = Math.round(((i + 1) / totalFrames) * 100);

      const detection = await faceapi
        .detectSingleFace(video)
        .withFaceLandmarks();

      if (!detection) {
        onProgress?.(pct, 'Mantén tu rostro visible frente a la cámara…');
        await this.sleep(this.FRAME_INTERVAL_MS);
        continue;
      }

      framesWithFace++;
      const landmarks = detection.landmarks;
      const positions = landmarks.positions;

      // Punto de la nariz (landmark 30) para tracking de movimiento
      const nose = positions[30];
      nosePositions.push({ x: nose.x, y: nose.y });

      // Calcular EAR (Eye Aspect Ratio) para ambos ojos
      const leftEAR = this.computeEAR(positions, 'left');
      const rightEAR = this.computeEAR(positions, 'right');
      const avgEAR = (leftEAR + rightEAR) / 2;
      earValues.push(avgEAR);

      // Detección de parpadeo: EAR baja y luego sube
      if (avgEAR < this.EAR_BLINK_THRESHOLD) {
        if (!wasEyeClosed) {
          wasEyeClosed = true;
        }
      } else {
        if (wasEyeClosed) {
          blinks++;
          wasEyeClosed = false;
        }
      }

      if (blinks >= this.MIN_BLINKS) {
        onProgress?.(pct, 'Parpadeo detectado ✓ Verificando movimiento…');
      } else {
        onProgress?.(pct, 'Parpadea de forma natural mirando a la cámara…');
      }

      await this.sleep(this.FRAME_INTERVAL_MS);
    }

    // ── Evaluar resultados ──
    const movement = this.computeTotalMovement(nosePositions);
    const earStdDev = this.stdDev(earValues);

    console.log('[FaceAuth Liveness]', {
      framesWithFace,
      totalFrames,
      faceRatio: (framesWithFace / totalFrames).toFixed(2),
      blinks,
      movement: movement.toFixed(2),
      earStdDev: earStdDev.toFixed(4),
      earValues: earValues.map(v => v.toFixed(3)),
    });

    if (framesWithFace < totalFrames * 0.4) {
      return { isLive: false, reason: 'No se detectó un rostro de forma continua. Mantén tu rostro frente a la cámara.' };
    }

    if (blinks < this.MIN_BLINKS) {
      return { isLive: false, reason: 'No se detectó parpadeo. Parpadea lentamente mirando a la cámara.' };
    }

    // Verificar micro-movimiento natural
    if (movement < this.MIN_MOVEMENT_PX) {
      return { isLive: false, reason: 'No se detectó movimiento natural. Mueve ligeramente la cabeza.' };
    }

    // Verificar variación de EAR (una foto tiene EAR constante)
    if (earStdDev < 0.003) {
      return { isLive: false, reason: 'Patrón ocular demasiado uniforme. Se requiere una persona real.' };
    }

    return { isLive: true };
  }

  /**
   * Calcula el Eye Aspect Ratio (EAR) para un ojo.
   * EAR = (||p2-p6|| + ||p3-p5||) / (2 * ||p1-p4||)
   * Landmarks 68-pt: left eye 36-41, right eye 42-47
   */
  private computeEAR(positions: faceapi.Point[], eye: 'left' | 'right'): number {
    const offset = eye === 'left' ? 36 : 42;
    const p1 = positions[offset];
    const p2 = positions[offset + 1];
    const p3 = positions[offset + 2];
    const p4 = positions[offset + 3];
    const p5 = positions[offset + 4];
    const p6 = positions[offset + 5];

    const vertical1 = this.dist(p2, p6);
    const vertical2 = this.dist(p3, p5);
    const horizontal = this.dist(p1, p4);

    if (horizontal === 0) return 0;
    return (vertical1 + vertical2) / (2 * horizontal);
  }

  private dist(a: faceapi.Point, b: faceapi.Point): number {
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
  }

  /** Calcula el movimiento total acumulado de la posición de la nariz */
  private computeTotalMovement(positions: { x: number; y: number }[]): number {
    if (positions.length < 2) return 0;
    let total = 0;
    for (let i = 1; i < positions.length; i++) {
      const dx = positions[i].x - positions[i - 1].x;
      const dy = positions[i].y - positions[i - 1].y;
      total += Math.sqrt(dx * dx + dy * dy);
    }
    return total;
  }

  /** Desviación estándar de un array de números */
  private stdDev(values: number[]): number {
    if (values.length < 2) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const sqDiffs = values.map(v => (v - mean) ** 2);
    return Math.sqrt(sqDiffs.reduce((a, b) => a + b, 0) / values.length);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ── Llamadas al backend ──────────────────────────────────────────────

  /** Registra el descriptor facial del usuario autenticado */
  enroll(descriptor: number[]): Observable<{ message: string }> {
    return this.api.post<{ message: string }>('/face/enroll', { descriptor });
  }

  /** Registro facial inicial durante login (sin JWT, usa tempToken). Devuelve JWT real. */
  enrollInitial(tempToken: string, descriptor: number[]): Observable<{ token: string; message: string }> {
    return this.api.post<{ token: string; message: string }>('/face/enroll-initial', { tempToken, descriptor });
  }

  /** Verifica el tempToken tras la validación facial en el navegador */
  verify(tempToken: string): Observable<{ token: string }> {
    return this.api.post<{ token: string }>('/face/verify', { tempToken });
  }

  /** Elimina el rostro registrado */
  unenroll(): Observable<{ message: string }> {
    return this.api.delete<{ message: string }>('/face/unenroll');
  }

  /** Consulta si el usuario tiene rostro registrado */
  getStatus(): Observable<{ hasFaceEnrolled: boolean }> {
    return this.api.get<{ hasFaceEnrolled: boolean }>('/face/status');
  }
}
