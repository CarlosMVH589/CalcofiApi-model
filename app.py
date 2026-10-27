from fastapi import FastAPI
from fastapi.responses import RedirectResponse # <-- Importante añadir esto
from pydantic import BaseModel
import numpy as np
from joblib import load
import pathlib
from fastapi.middleware.cors import CORSMiddleware

origins = ["*"]

app = FastAPI(title='CalCOFI Temperature Prediction API')

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---- AGREGAR ESTA RUTA RAÍZ ----
@app.get("/", include_in_schema=False)
def root():
    # Redirige automáticamente a tu profesor directamente a la documentación
    return RedirectResponse(url="/docs")
# ---------------------------------

# Cargar el modelo entrenado previamente
model_path = pathlib.Path('model/calcofi-v1.joblib')
model = load(model_path)

class InputData(BaseModel):
    Depthm: float = 0.0     
    Salnty: float = 33.5    

class OutputData(BaseModel):
    predicted_temperature: float

@app.post('/score', response_model=OutputData)
def score(data: InputData):
    model_input = np.array([[data.Depthm, data.Salnty]])
    result = model.predict(model_input)
    return {'predicted_temperature': float(result[0])}