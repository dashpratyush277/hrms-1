# HRMS Mobile App

## Setup

1. Install dependencies:
```bash
flutter pub get
```

2. Configure API URL:
   - Edit `lib/config/api_config.dart`
   - For Android emulator: Use `http://10.0.2.2:5000` (default)
   - For physical device: Use your machine's IP address (e.g., `http://192.168.1.3:5000`)

3. Make sure backend is running on port 5000

## Running

```bash
# List available devices
flutter devices

# Run on emulator
flutter run

# Run on specific device
flutter run -d <device-id>
```

## Troubleshooting

### Login fails
1. Check backend is running: `http://localhost:5000/api/docs`
2. Check API URL in `lib/config/api_config.dart`
3. For physical device, use your machine's IP instead of 10.0.2.2
4. Check console logs for detailed error messages

### Cannot connect to server
- Make sure backend is running
- Check firewall settings
- For physical device, ensure phone and computer are on same network
- Try using your machine's IP address instead of 10.0.2.2

## Test Credentials

- Employee: `employee@example.com` / `emp123`
- HR Admin: `hr@example.com` / `hr123`
