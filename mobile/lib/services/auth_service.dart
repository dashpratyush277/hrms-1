import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import '../config/api_config.dart';

class AuthService extends ChangeNotifier {
  final FlutterSecureStorage _storage = const FlutterSecureStorage();
  String? _accessToken;
  String? _refreshToken;
  Map<String, dynamic>? _user;

  bool get isAuthenticated => _accessToken != null;

  Map<String, dynamic>? get user => _user;

  bool _isLoading = true;

  bool get isLoading => _isLoading;

  AuthService() {
    _loadTokens();
  }

  Future<void> _loadTokens() async {
    try {
      _accessToken = await _storage.read(key: 'accessToken');
      _refreshToken = await _storage.read(key: 'refreshToken');
      final userStr = await _storage.read(key: 'user');
      if (userStr != null) {
        _user = jsonDecode(userStr);
      }
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      print('Error loading tokens: $e');
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<Map<String, dynamic>> login(String email, String password) async {
    try {
      final url = '${ApiConfig.apiUrl}/auth/login';
      print('Attempting login to: $url');
      
      final response = await http.post(
        Uri.parse(url),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'email': email, 'password': password}),
      ).timeout(const Duration(seconds: 10));

      print('Response status: ${response.statusCode}');
      print('Response body: ${response.body}');

      if (response.statusCode == 200 || response.statusCode == 201) {
        final data = jsonDecode(response.body);
        _accessToken = data['accessToken'];
        _refreshToken = data['refreshToken'];
        _user = data['user'];

        await _storage.write(key: 'accessToken', value: _accessToken);
        await _storage.write(key: 'refreshToken', value: _refreshToken);
        await _storage.write(key: 'user', value: jsonEncode(_user));

        notifyListeners();
        return {'success': true};
      } else {
        final errorData = jsonDecode(response.body);
        return {
          'success': false,
          'message': errorData['message'] ?? 'Login failed',
        };
      }
    } catch (e) {
      print('Login error: $e');
      return {
        'success': false,
        'message': e.toString().contains('Failed host lookup') 
            ? 'Cannot connect to server. Make sure backend is running on port 5000.'
            : e.toString(),
      };
    }
  }

  Future<void> logout() async {
    _accessToken = null;
    _refreshToken = null;
    _user = null;

    await _storage.delete(key: 'accessToken');
    await _storage.delete(key: 'refreshToken');
    await _storage.delete(key: 'user');

    notifyListeners();
  }

  Future<Map<String, String>> getAuthHeaders() async {
    if (_accessToken == null) {
      await _loadTokens();
    }
    return {
      'Authorization': 'Bearer $_accessToken',
      'Content-Type': 'application/json',
    };
  }
}

