import React, { useState, useEffect } from 'react';
import { Cloud, Sun, CloudRain, Wind, Droplets, Thermometer } from 'lucide-react';
import { T } from '../contexts/LanguageContext';

interface WeatherData {
  temperature: number;
  humidity: number;
  windSpeed: number;
  condition: 'sunny' | 'cloudy' | 'rainy';
  description: string;
}

export function WeatherWidget() {
  const [weather, setWeather] = useState<WeatherData>({
    temperature: 28,
    humidity: 65,
    windSpeed: 12,
    condition: 'sunny',
    description: 'Clear sky, good for construction work'
  });

  const getWeatherIcon = () => {
    switch (weather.condition) {
      case 'sunny':
        return <Sun className="w-8 h-8 text-yellow-500" />;
      case 'cloudy':
        return <Cloud className="w-8 h-8 text-gray-500" />;
      case 'rainy':
        return <CloudRain className="w-8 h-8 text-blue-500" />;
      default:
        return <Sun className="w-8 h-8 text-yellow-500" />;
    }
  };

  const getConditionColor = () => {
    switch (weather.condition) {
      case 'sunny':
        return 'from-yellow-400 to-orange-500';
      case 'cloudy':
        return 'from-gray-400 to-gray-600';
      case 'rainy':
        return 'from-blue-400 to-blue-600';
      default:
        return 'from-yellow-400 to-orange-500';
    }
  };

  return (
    <div className={`bg-gradient-to-br ${getConditionColor()} rounded-xl p-4 text-white shadow-lg`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {getWeatherIcon()}
          <div>
            <h3 className="font-semibold text-lg">
              <T>Weather</T>
            </h3>
            <p className="text-sm opacity-90">Construction Planning</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold">{weather.temperature}°C</div>
          <div className="text-sm opacity-90 capitalize">{weather.condition}</div>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-3 mt-3">
        <div className="flex items-center gap-2 bg-white/20 rounded-lg p-2">
          <Droplets className="w-4 h-4" />
          <div>
            <div className="text-xs opacity-90"><T>Humidity</T></div>
            <div className="font-semibold">{weather.humidity}%</div>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-white/20 rounded-lg p-2">
          <Wind className="w-4 h-4" />
          <div>
            <div className="text-xs opacity-90"><T>Wind Speed</T></div>
            <div className="font-semibold">{weather.windSpeed} km/h</div>
          </div>
        </div>
      </div>
      
      <div className="mt-3 text-sm opacity-90">
        {weather.description}
      </div>
    </div>
  );
}