import requests

# URL de tu API (puedes cambiarla por la URL que te dé Render cuando se despliegue)
# url = 'https://tu-proyecto.onrender.com/score'
url = 'http://127.0.0.1:8000/score'

# Datos de prueba con los parámetros que recibe tu modelo (Profundidad y Salinidad)
#coment
body = {
    "Depthm": 10.0,
    "Salnty": 33.46
}

# Realizar la petición POST a la API
response = requests.post(url, json=body)

# Imprimir la respuesta obtenida
print("Respuesta del servidor:")
print(response.json())