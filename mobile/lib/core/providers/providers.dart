import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:egyptian_cal/core/api/api_service.dart';
import 'package:egyptian_cal/core/models/models.dart';
import 'package:shared_preferences/shared_preferences.dart';

const _userIdKey = 'user_id';

// ─── Shared Preferences ───────────────────────────────────────────────────────

final sharedPreferencesProvider = Provider<SharedPreferences>((ref) {
  throw UnimplementedError('Override with actual SharedPreferences instance');
});

// ─── API Service ──────────────────────────────────────────────────────────────

final apiServiceProvider = Provider<ApiService>((ref) => ApiService());

// ─── User ID ──────────────────────────────────────────────────────────────────

final userIdProvider = StateProvider<String?>((ref) {
  final prefs = ref.read(sharedPreferencesProvider);
  return prefs.getString(_userIdKey);
});

// ─── User Profile ─────────────────────────────────────────────────────────────

final userProfileProvider = FutureProvider<UserProfile?>((ref) async {
  final userId = ref.watch(userIdProvider);
  if (userId == null) return null;
  final api = ref.read(apiServiceProvider);
  return api.getUser(userId);
});

// ─── Food Search ──────────────────────────────────────────────────────────────

final foodSearchQueryProvider = StateProvider<String>((ref) => '');

final foodSearchResultsProvider = FutureProvider<List<FoodRecord>>((ref) async {
  final query = ref.watch(foodSearchQueryProvider);
  if (query.trim().isEmpty) return [];
  final api = ref.read(apiServiceProvider);
  return api.searchFoods(query);
});

// ─── Calculated Targets ───────────────────────────────────────────────────────

class CalcTargetsParams {
  const CalcTargetsParams({
    required this.weightKg,
    required this.heightCm,
    required this.age,
    required this.gender,
    required this.activityLevel,
    required this.goal,
  });
  final double weightKg;
  final double heightCm;
  final int age;
  final String gender;
  final String activityLevel;
  final String goal;
}

final calcTargetsParamsProvider = StateProvider<CalcTargetsParams?>((ref) => null);

final calculatedTargetsProvider = FutureProvider<CalculatedTargets?>((ref) async {
  final params = ref.watch(calcTargetsParamsProvider);
  if (params == null) return null;
  final api = ref.read(apiServiceProvider);
  return api.calculateTargets(
    weightKg: params.weightKg,
    heightCm: params.heightCm,
    age: params.age,
    gender: params.gender,
    activityLevel: params.activityLevel,
    goal: params.goal,
  );
});

// ─── Meal Analysis ────────────────────────────────────────────────────────────

final mealResultProvider = StateProvider<MealResult?>((ref) => null);
