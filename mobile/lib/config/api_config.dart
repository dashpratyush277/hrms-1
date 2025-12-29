class ApiConfig {
  // For Android emulator: 10.0.2.2 maps to host machine's localhost
  // For physical device or if 10.0.2.2 doesn't work, use your machine's IP
  // Find your IP with: ipconfig (Windows) or ifconfig (Mac/Linux)
  // Example: 'http://192.168.1.3:5000'
  
  // Try 10.0.2.2 first (Android emulator default)
  // If that doesn't work, change to your machine's IP address
  static const String baseUrl = 'http://10.0.2.2:5000';
  
  // Alternative: Use your machine's IP (uncomment and update if needed)
  // static const String baseUrl = 'http://192.168.1.3:5000';
  
  static String get apiUrl => '$baseUrl/api';
}

