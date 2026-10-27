import pathlib
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, r2_score
from joblib import dump

# 1. Asegurar que exista la carpeta model
pathlib.Path('model').mkdir(parents=True, exist_ok=True)

# 2. Cargar y limpiar el dataset de CalCOFI
print("Cargando dataset...")
ruta_csv = pathlib.Path('data/bottle.csv')
df = pd.read_csv(ruta_csv, usecols=['Depthm', 'Salnty', 'T_degC'], low_memory=False).dropna()

y = df['T_degC']
X = df[['Depthm', 'Salnty']]

# 3. Dividir datos en entrenamiento y prueba
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# 4. Entrenar el modelo Random Forest de Regresión
print("Entrenando RandomForestRegressor...")
modelo = RandomForestRegressor(
    n_estimators=50, 
    max_depth=12, 
    n_jobs=-1, 
    random_state=42
)
modelo.fit(X_train, y_train)

# 5. Evaluar métricas
predicciones = modelo.predict(X_test)
mae = mean_absolute_error(y_test, predicciones)
r2 = r2_score(y_test, predicciones)
print(f"Modelo entrenado con éxito -> MAE: {mae:.4f} °C | R²: {r2:.4f}")

# 6. Guardar el modelo entrenado con joblib
print("Guardando modelo en la carpeta model/...")
dump(modelo, pathlib.Path('model/calcofi-v1.joblib'))

#coment