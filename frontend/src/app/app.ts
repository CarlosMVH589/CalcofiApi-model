import { CommonModule } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TimeoutError, finalize, timeout } from 'rxjs';

interface PredictionModel {
  readonly label: string;
  readonly percentage: number;
  readonly endpoint: string;
}

interface TrainingDataset {
  readonly label: string;
  readonly percentage: number;
  readonly url: string;
  readonly sha: string;
}

interface PredictionResponse {
  readonly predicted_temperature: number;
}

interface DispatchResponse {
  readonly event_type: string;
  readonly client_payload: {
    readonly dataseturl: string;
    readonly sha: string;
  };
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class AppComponent {
  private readonly http = inject(HttpClient);

  readonly predictionModels: readonly PredictionModel[] = [
    {
      label: 'Modelo Calcofi entrenado al 100%',
      percentage: 100,
      endpoint: 'https://calcofiapi-model-v1-0-calcofi-100.onrender.com/score',
    },
    {
      label: 'Modelo Calcofi entrenado al 50%',
      percentage: 50,
      endpoint: 'https://calcofiapi-model-v1-0-calcofi-50.onrender.com/score',
    },
    {
      label: 'Modelo Calcofi entrenado al 25%',
      percentage: 25,
      endpoint: 'https://calcofiapi-model-v1-0-calcofi-25.onrender.com/score',
    },
  ];

  readonly trainingDatasets: readonly TrainingDataset[] = [
    {
      label: 'Dataset completo - 100%',
      percentage: 100,
      url: 'https://github.com/CarlosMVH589/CalcofiApi-model/releases/download/v1.0.0/bottle.csv',
      sha: 'v1.0-calcofi-100',
    },
    {
      label: 'Dataset 50%',
      percentage: 50,
      url: 'https://github.com/CarlosMVH589/CalcofiApi-model/releases/download/v1.0.0/Bottle_50.csv',
      sha: 'v1.0-calcofi-50',
    },
    {
      label: 'Dataset 25%',
      percentage: 25,
      url: 'https://github.com/CarlosMVH589/CalcofiApi-model/releases/download/v1.0.0/Bottle_25.csv',
      sha: 'v1.0-calcofi-25',
    },
  ];

  selectedModel = this.predictionModels[0];
  selectedDataset = this.trainingDatasets[0];
  depthm = 0;
  salnty = 33.5;
  prediction: number | null = null;
  predictionLoading = false;
  predictionError = '';
  githubToken = '';
  retrainingSha = this.selectedDataset.sha;
  retrainingLoading = false;
  retrainingMessage = '';
  retrainingError = '';

  calculatePrediction(): void {
    this.predictionError = '';
    this.prediction = null;

    if (!Number.isFinite(this.depthm) || !Number.isFinite(this.salnty)) {
      this.predictionError = 'Ingresa valores numéricos válidos para profundidad y salinidad.';
      return;
    }

    const payload = {
      Depthm: Number(this.depthm),
      Salnty: Number(this.salnty),
    };

    this.predictionLoading = true;
    this.http.post<PredictionResponse>(this.selectedModel.endpoint, payload)
      .pipe(
        timeout(30000),
        finalize(() => this.predictionLoading = false),
      )
      .subscribe({
        next: (response) => {
          if (!Number.isFinite(response.predicted_temperature)) {
            this.predictionError = 'La API devolvió un resultado no válido.';
            return;
          }
          this.prediction = response.predicted_temperature;
        },
        error: (error: unknown) => this.predictionError = this.getPredictionError(error),
      });
  }

  selectDataset(): void {
    this.retrainingSha = this.selectedDataset.sha;
    this.retrainingError = '';
    this.retrainingMessage = '';
  }

  dispatchRetraining(): void {
    this.retrainingError = '';
    this.retrainingMessage = '';
    const token = this.githubToken.trim();
    const sha = this.retrainingSha.trim();

    if (!token || !sha || !this.selectedDataset) {
      this.retrainingError = 'Selecciona un dataset e ingresa el token y el SHA de re-entrenamiento.';
      return;
    }

    const dispatchUrl = 'https://api.github.com/repos/CarlosMVH589/CalcofiApi-model/dispatches';
    const body: DispatchResponse = {
      event_type: 'ml_ci_cd',
      client_payload: {
        dataseturl: this.selectedDataset.url,
        sha,
      },
    };

    this.retrainingLoading = true;
    this.http.post(dispatchUrl, body, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      observe: 'response',
    })
      .pipe(
        timeout(30000),
        finalize(() => this.retrainingLoading = false),
      )
      .subscribe({
        next: (response) => {
          if (response.status === 204) {
            this.retrainingMessage = 'Re-entrenamiento disparado correctamente en GitHub Actions.';
            this.githubToken = '';
            return;
          }
          this.retrainingError = `GitHub devolvió un estado inesperado (${response.status}).`;
        },
        error: (error: unknown) => this.retrainingError = this.getRetrainingError(error),
      });
  }

  private getPredictionError(error: unknown): string {
    if (error instanceof TimeoutError) {
      return 'El servicio tardó demasiado. Puede estar despertando en Render; inténtalo de nuevo.';
    }
    if (error instanceof HttpErrorResponse) {
      if (error.status === 0) {
        return 'No se pudo conectar con el modelo. Revisa CORS o la disponibilidad de Render.';
      }
      if (error.status === 400 || error.status === 422) {
        return 'La API rechazó los datos enviados. Revisa profundidad y salinidad.';
      }
      if (error.status === 404) {
        return 'La ruta de predicción no existe en el modelo seleccionado.';
      }
      if (error.status >= 500) {
        return 'El modelo no está disponible en este momento. Inténtalo nuevamente.';
      }
      return `La API respondió con un error HTTP ${error.status}.`;
    }
    return 'Ocurrió un error inesperado al consultar la predicción.';
  }

  private getRetrainingError(error: unknown): string {
    if (error instanceof TimeoutError) {
      return 'GitHub tardó demasiado en responder. Verifica el estado del workflow.';
    }
    if (error instanceof HttpErrorResponse) {
      switch (error.status) {
        case 0:
          return 'No se pudo conectar con GitHub. Revisa CORS o tu conexión.';
        case 401:
          return 'El token es inválido o no está autenticado.';
        case 403:
          return 'El token no tiene permisos suficientes para disparar el workflow.';
        case 404:
          return 'No se encontró el repositorio o el endpoint de dispatch.';
        case 422:
          return 'GitHub rechazó el payload o el evento no está configurado.';
        default:
          return `GitHub respondió con un error HTTP ${error.status}.`;
      }
    }
    return 'Ocurrió un error inesperado al disparar el re-entrenamiento.';
  }
}
