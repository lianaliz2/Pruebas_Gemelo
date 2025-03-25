import folium

# Crear un mapa centrado en una ubicación
m = folium.Map(location=[40.4168, -3.7038], zoom_start=10)  # Madrid

# Agregar una capa GeoJSON
geojson_path = "datos.geojson"  # Ruta al archivo GeoJSON
folium.GeoJson(geojson_path, name="Capa GIS").add_to(m)

# Agregar un control de capas
folium.LayerControl().add_to(m)

# Guardar el mapa en un archivo HTML
m.save("mapa_gis1.html")