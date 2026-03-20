import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import * as faceapi from 'face-api.js';

/**
 * Servicio de autenticación facial.
 * Carga modelos de face-api.js, captura descriptores desde webcam
 * y los compara localmente contra el descriptor almacenado.
 */
@Injectable({ providedIn: 'root' })
export class FaceAuthService {
  private readonly api = inject(ApiService);
  private modelsLoaded = false;

  // Umbral de distancia euclidiana para considerar coincidencia facial
  private readonly MATCH_THRESHOLD = 0.6;

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
    return distance < this.MATCH_THRESHOLD;
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
