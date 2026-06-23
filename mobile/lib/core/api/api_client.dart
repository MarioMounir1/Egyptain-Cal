import 'package:dio/dio.dart';

class ApiClient {
  ApiClient._internal() {
    _dio = Dio(
      BaseOptions(
        baseUrl: 'http://10.0.2.2:3001', // Android emulator loopback
        connectTimeout: const Duration(seconds: 15),
        receiveTimeout: const Duration(seconds: 30),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      ),
    );

    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) {
          // ignore: avoid_print
          print('[API] ${options.method} ${options.path}');
          return handler.next(options);
        },
        onResponse: (response, handler) {
          // ignore: avoid_print
          print('[API] ${response.statusCode} ${response.requestOptions.path}');
          return handler.next(response);
        },
        onError: (DioException err, handler) {
          // ignore: avoid_print
          print('[API Error] ${err.response?.statusCode} ${err.message}');
          return handler.next(err);
        },
      ),
    );
  }

  static final ApiClient _instance = ApiClient._internal();
  static ApiClient get instance => _instance;

  late final Dio _dio;
  Dio get dio => _dio;

  /// Update base URL (for switching between emulator / real device / production)
  void setBaseUrl(String url) {
    _dio.options.baseUrl = url;
  }
}

/// Custom API exception
class ApiException implements Exception {
  const ApiException({
    required this.code,
    required this.message,
    this.details,
    this.statusCode,
  });

  final String code;
  final String message;
  final Map<String, dynamic>? details;
  final int? statusCode;

  factory ApiException.fromDioError(DioException err) {
    final data = err.response?.data;
    if (data is Map<String, dynamic>) {
      return ApiException(
        code: data['code'] as String? ?? 'UNKNOWN_ERROR',
        message: data['message'] as String? ?? err.message ?? 'Unknown error',
        details: data['details'] as Map<String, dynamic>?,
        statusCode: err.response?.statusCode,
      );
    }
    return ApiException(
      code: _mapDioError(err.type),
      message: err.message ?? 'Network error',
      statusCode: err.response?.statusCode,
    );
  }

  static String _mapDioError(DioExceptionType type) {
    switch (type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.sendTimeout:
      case DioExceptionType.receiveTimeout:
        return 'TIMEOUT';
      case DioExceptionType.connectionError:
        return 'CONNECTION_ERROR';
      case DioExceptionType.cancel:
        return 'REQUEST_CANCELLED';
      default:
        return 'UNKNOWN_ERROR';
    }
  }

  @override
  String toString() => 'ApiException($code): $message';
}
