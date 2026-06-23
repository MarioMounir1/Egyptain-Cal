import 'package:dio/dio.dart';
import 'package:egyptian_cal/core/api/api_client.dart';
import 'package:egyptian_cal/core/models/models.dart';

class ApiService {
  ApiService() : _dio = ApiClient.instance.dio;

  final Dio _dio;

  // ─── Health ────────────────────────────────────────────────────────────────

  Future<bool> checkHealth() async {
    try {
      final res = await _dio.get('/health');
      return res.data['status'] == 'ok';
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  // ─── Users ─────────────────────────────────────────────────────────────────

  Future<UserProfile> getUser(String id) async {
    try {
      final res = await _dio.get('/api/v1/users/$id');
      return UserProfile.fromJson(res.data['data'] as Map<String, dynamic>);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<UserProfile> updateUser(String id, Map<String, dynamic> body) async {
    try {
      final res = await _dio.put('/api/v1/users/$id', data: body);
      return UserProfile.fromJson(res.data['data'] as Map<String, dynamic>);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<CalculatedTargets> calculateTargets({
    required double weightKg,
    required double heightCm,
    required int age,
    required String gender,
    required String activityLevel,
    required String goal,
  }) async {
    try {
      final res = await _dio.post('/api/v1/users/calculate', data: {
        'weight_kg': weightKg,
        'height_cm': heightCm,
        'age': age,
        'gender': gender,
        'activity_level': activityLevel,
        'goal': goal,
      });
      return CalculatedTargets.fromJson(res.data['data'] as Map<String, dynamic>);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  // ─── Foods ─────────────────────────────────────────────────────────────────

  Future<FoodRecord> createFood({
    required String name,
    String? nameEn,
    String? barcode,
    String? category,
    String? servingDesc,
    required int calories,
    required double protein,
    required double carbs,
    required double fat,
    String source = 'manual',
  }) async {
    try {
      final res = await _dio.post('/api/v1/foods', data: {
        'name': name,
        if (nameEn != null) 'name_en': nameEn,
        if (barcode != null) 'barcode': barcode,
        if (category != null) 'category': category,
        if (servingDesc != null) 'serving_desc': servingDesc,
        'calories': calories,
        'protein': protein,
        'carbs': carbs,
        'fat': fat,
        'source': source,
      });
      return FoodRecord.fromJson(res.data['data'] as Map<String, dynamic>);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<List<FoodRecord>> searchFoods(String query) async {
    try {
      final res = await _dio.get('/api/v1/foods/search', queryParameters: {'q': query});
      final list = res.data['data'] as List;
      return list.map((e) => FoodRecord.fromJson(e as Map<String, dynamic>)).toList();
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<FoodRecord> getFood(String id) async {
    try {
      final res = await _dio.get('/api/v1/foods/$id');
      return FoodRecord.fromJson(res.data['data'] as Map<String, dynamic>);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  // ─── Meals ─────────────────────────────────────────────────────────────────

  Future<MealResult> analyzeMealText({
    required String rawText,
    required String userId,
  }) async {
    try {
      final res = await _dio.post('/api/v1/meals/analyze', data: {
        'rawText': rawText,
        'userId': userId,
      });
      return MealResult.fromJson(res.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<MealResult> analyzeMealPhoto({
    required String base64Image,
    required String userId,
    String mode = 'photo',
  }) async {
    try {
      final res = await _dio.post('/api/v1/meals/analyze-photo', data: {
        'image': base64Image,
        'userId': userId,
        'mode': mode,
      });
      return MealResult.fromJson(res.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }
}
