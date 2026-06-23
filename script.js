const cityInput = document.getElementById("cityInput");
const searchForm = document.getElementById("searchForm");
const cityName = document.getElementById("cityName");
const temperature = document.getElementById("temperature");
const conditionText = document.getElementById("conditionText");
const feelsLike = document.getElementById("feelsLike");
const humidity = document.getElementById("humidity");
const wind = document.getElementById("wind");
const uv = document.getElementById("uv");
const forecastList = document.getElementById("forecastList");
const heroIcon = document.getElementById("heroIcon");
const errorMessage = document.getElementById("errorMessage");

function getDayName(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", { weekday: "short" });
}

// Convert a WMO weather code to description
function getWeatherDescription(code) {

  const weatherDescriptions = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Depositing rime fog",
    51: "Light drizzle",
    53: "Moderate drizzle",
    55: "Dense drizzle",
    61: "Slight rain",
    63: "Moderate rain",
    65: "Heavy rain",
    71: "Slight snow fall",
    73: "Moderate snow fall",
    75: "Heavy snow fall",
    80: "Slight rain showers",
    81: "Moderate rain showers",
    82: "Violent rain showers",
    95: "Thunderstorm"
  };

  return weatherDescriptions[code] || "Unknown weather";
}

// Convert a WMO weather code to icon
function getWeatherIcon(code) {
  if (code === 0) {
    return "☀️";
  }
  if (code === 1 || code === 2) {
    return "⛅";
  }
  if ([45, 48, 51, 53, 55, 61, 63, 65, 80, 81, 82].indexOf(code) !== -1) {
    return "🌧️";
  }
  if ([71, 73, 75].indexOf(code) !== -1) {
    return "❄️";
  }
  if (code === 95) {
    return "⛈️";
  }
  return "☁️";
}

function getUvCategory(uvValue) {
  if (uvValue === null || uvValue === "N/A") {
    return "N/A";
  }

  if (uvValue <= 2) {
    return "Low";
  }
  if (uvValue <= 5) {
    return "Moderate";
  }
  return "High";
}

// Get coordinates for a city name
async function getCoordinates(city) {
  const url = "https://geocoding-api.open-meteo.com/v1/search?name=" + encodeURIComponent(city) + "&count=1&language=en&format=json";
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Unable to reach the geocoding service.");
  }

  const data = await response.json();

  if (!data.results || data.results.length === 0) {
    throw new Error("City not found. Please check the spelling and try again.");
  }

  const location = data.results[0];

  return {
    name: location.name + ", " + location.country,
    latitude: location.latitude,
    longitude: location.longitude,
    timezone: location.timezone || "auto"
  };
}

// Fetch current weather and 5-day forecast
async function getWeather(latitude, longitude, timezone) {
  const url = "https://api.open-meteo.com/v1/forecast?latitude=" + latitude + "&longitude=" + longitude + "&timezone=" + encodeURIComponent(timezone) + "&current_weather=true&daily=weathercode,temperature_2m_max,temperature_2m_min,uv_index_max&hourly=relativehumidity_2m,apparent_temperature&windspeed_unit=kmh&temperature_unit=celsius";
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Unable to retrieve weather data.");
  }

  const data = await response.json();

  if (!data.current_weather || !data.daily || !data.hourly) {
    throw new Error("Incomplete weather data returned from the service.");
  }

  const currentTime = data.current_weather.time;
  const hourIndex = data.hourly.time.indexOf(currentTime);
  const humidityValue = hourIndex !== -1 ? data.hourly.relativehumidity_2m[hourIndex] : null;
  const feelsLikeValue = hourIndex !== -1 ? data.hourly.apparent_temperature[hourIndex] : null;
  const uvValue = data.daily.uv_index_max && data.daily.uv_index_max.length > 0 ? data.daily.uv_index_max[0] : null;

  const uvCategory = uvValue !== null ? getUvCategory(Math.round(uvValue)) : "N/A";

  return {
    temperature: Math.round(data.current_weather.temperature) + "°C",
    condition: getWeatherDescription(data.current_weather.weathercode),
    humidity: humidityValue !== null ? Math.round(humidityValue) + "%" : "N/A",
    wind: Math.round(data.current_weather.windspeed) + " km/h",
    feelsLike: feelsLikeValue !== null ? Math.round(feelsLikeValue) + "°C" : "N/A",
    uv: uvCategory,
    weatherCode: data.current_weather.weathercode,
    daily: data.daily
  };
}
// Show an error message on the page
function showError(message) {
  errorMessage.textContent = message;
  errorMessage.style.display = "block";
}

function hideError() {
  errorMessage.textContent = "";
  errorMessage.style.display = "none";
}

// Update the DOM with current weather data
function renderWeather(weather, locationName) {
  cityName.textContent = locationName;
  temperature.textContent = weather.temperature;
  conditionText.textContent = weather.condition;
  feelsLike.textContent = "Feels like " + weather.feelsLike;
  humidity.textContent = weather.humidity;
  wind.textContent = weather.wind;
  uv.textContent = weather.uv;
  heroIcon.textContent = getWeatherIcon(weather.weatherCode);

  forecastList.innerHTML = "";

// Update the DOM with 5-day forecast
  for (let i = 0; i < 5; i++) {
    const dayName = getDayName(weather.daily.time[i]);
    const maxTemp = Math.round(weather.daily.temperature_2m_max[i]) + "°";
    const minTemp = Math.round(weather.daily.temperature_2m_min[i]) + "°";
    const icon = getWeatherIcon(weather.daily.weathercode[i]);

    const forecastItem =
      '<article class="forecast-item">' +
      '<div class="forecast-day">' + dayName + '</div>' +
      '<div class="forecast-icon" aria-hidden="true">' + icon + '</div>' +
      '<div class="forecast-temp">' +
      '<span class="temp-high">' + maxTemp + '</span>' +
      '<span class="temp-low">' + minTemp + '</span>' +
      '</div>' +
      '</article>';

    forecastList.innerHTML = forecastList.innerHTML + forecastItem;
  }
}

// Main function triggered by the Search button
async function searchWeather(event) {
  event.preventDefault();
  hideError();

  const city = cityInput.value.trim();

  if (city === "") {
    showError("Please enter a city name.");
    return;
  }

  try {
    const location = await getCoordinates(city);
    const weather = await getWeather(location.latitude, location.longitude, location.timezone);
    renderWeather(weather, location.name);
  } catch (error) {
    showError(error.message);
  }
}

searchForm.addEventListener("submit", searchWeather);

async function loadDefaultWeather() {
  try {
    const location = await getCoordinates("Lagos");
    const weather = await getWeather(location.latitude, location.longitude, location.timezone);
    renderWeather(weather, location.name);
  } catch (error) {
    showError(error.message);
  }
}

loadDefaultWeather();
