// Core data models for Egyptian Cal

// ─── User Profile ─────────────────────────────────────────────────────────────

class UserProfile {
  const UserProfile({
    required this.id,
    required this.email,
    required this.displayName,
    this.dailyCalorieGoal,
    this.weightKg,
    this.heightCm,
    this.age,
    this.gender,
    this.activityLevel,
    this.goal,
    this.targetProteinG,
    this.targetCarbsG,
    this.targetFatG,
    required this.createdAt,
    required this.updatedAt,
  });

  final String id;
  final String email;
  final String displayName;
  final double? dailyCalorieGoal;
  final double? weightKg;
  final double? heightCm;
  final int? age;
  final String? gender;
  final String? activityLevel;
  final String? goal;
  final double? targetProteinG;
  final double? targetCarbsG;
  final double? targetFatG;
  final DateTime createdAt;
  final DateTime updatedAt;

  factory UserProfile.fromJson(Map<String, dynamic> json) {
    return UserProfile(
      id: json['id'] as String,
      email: json['email'] as String,
      displayName: json['display_name'] as String,
      dailyCalorieGoal: (json['daily_calorie_goal'] as num?)?.toDouble(),
      weightKg: (json['weight_kg'] as num?)?.toDouble(),
      heightCm: (json['height_cm'] as num?)?.toDouble(),
      age: json['age'] as int?,
      gender: json['gender'] as String?,
      activityLevel: json['activity_level'] as String?,
      goal: json['goal'] as String?,
      targetProteinG: (json['target_protein_g'] as num?)?.toDouble(),
      targetCarbsG: (json['target_carbs_g'] as num?)?.toDouble(),
      targetFatG: (json['target_fat_g'] as num?)?.toDouble(),
      createdAt: DateTime.parse(json['created_at'] as String),
      updatedAt: DateTime.parse(json['updated_at'] as String),
    );
  }

  Map<String, dynamic> toJson() => {
        'display_name': displayName,
        if (weightKg != null) 'weight_kg': weightKg,
        if (heightCm != null) 'height_cm': heightCm,
        if (age != null) 'age': age,
        if (gender != null) 'gender': gender,
        if (activityLevel != null) 'activity_level': activityLevel,
        if (goal != null) 'goal': goal,
        if (dailyCalorieGoal != null) 'daily_calorie_goal': dailyCalorieGoal,
        if (targetProteinG != null) 'target_protein_g': targetProteinG,
        if (targetCarbsG != null) 'target_carbs_g': targetCarbsG,
        if (targetFatG != null) 'target_fat_g': targetFatG,
      };

  UserProfile copyWith({
    String? displayName,
    double? dailyCalorieGoal,
    double? weightKg,
    double? heightCm,
    int? age,
    String? gender,
    String? activityLevel,
    String? goal,
    double? targetProteinG,
    double? targetCarbsG,
    double? targetFatG,
  }) {
    return UserProfile(
      id: id,
      email: email,
      displayName: displayName ?? this.displayName,
      dailyCalorieGoal: dailyCalorieGoal ?? this.dailyCalorieGoal,
      weightKg: weightKg ?? this.weightKg,
      heightCm: heightCm ?? this.heightCm,
      age: age ?? this.age,
      gender: gender ?? this.gender,
      activityLevel: activityLevel ?? this.activityLevel,
      goal: goal ?? this.goal,
      targetProteinG: targetProteinG ?? this.targetProteinG,
      targetCarbsG: targetCarbsG ?? this.targetCarbsG,
      targetFatG: targetFatG ?? this.targetFatG,
      createdAt: createdAt,
      updatedAt: updatedAt,
    );
  }
}

// ─── Food Record ──────────────────────────────────────────────────────────────

class FoodRecord {
  const FoodRecord({
    required this.id,
    required this.name,
    this.nameEn,
    this.barcode,
    this.category,
    this.servingDesc,
    required this.source,
    required this.verified,
    required this.caloriesMin,
    required this.caloriesMax,
    required this.proteinMinG,
    required this.proteinMaxG,
    required this.carbsMinG,
    required this.carbsMaxG,
    required this.fatMinG,
    required this.fatMaxG,
    required this.createdAt,
    required this.updatedAt,
  });

  final String id;
  final String name;
  final String? nameEn;
  final String? barcode;
  final String? category;
  final String? servingDesc;
  final String source;
  final bool verified;
  final double caloriesMin;
  final double caloriesMax;
  final double proteinMinG;
  final double proteinMaxG;
  final double carbsMinG;
  final double carbsMaxG;
  final double fatMinG;
  final double fatMaxG;
  final DateTime createdAt;
  final DateTime updatedAt;

  double get caloriesMid => (caloriesMin + caloriesMax) / 2;
  double get proteinMid => (proteinMinG + proteinMaxG) / 2;
  double get carbsMid => (carbsMinG + carbsMaxG) / 2;
  double get fatMid => (fatMinG + fatMaxG) / 2;

  factory FoodRecord.fromJson(Map<String, dynamic> json) {
    return FoodRecord(
      id: json['id'] as String,
      name: json['name'] as String,
      nameEn: json['name_en'] as String?,
      barcode: json['barcode'] as String?,
      category: json['category'] as String?,
      servingDesc: json['serving_desc'] as String?,
      source: json['source'] as String? ?? 'manual',
      verified: json['verified'] as bool? ?? false,
      caloriesMin: (json['calories_min'] as num).toDouble(),
      caloriesMax: (json['calories_max'] as num).toDouble(),
      proteinMinG: (json['protein_min_g'] as num).toDouble(),
      proteinMaxG: (json['protein_max_g'] as num).toDouble(),
      carbsMinG: (json['carbs_min_g'] as num).toDouble(),
      carbsMaxG: (json['carbs_max_g'] as num).toDouble(),
      fatMinG: (json['fat_min_g'] as num).toDouble(),
      fatMaxG: (json['fat_max_g'] as num).toDouble(),
      createdAt: DateTime.parse(json['created_at'] as String),
      updatedAt: DateTime.parse(json['updated_at'] as String),
    );
  }
}

// ─── Meal Result ──────────────────────────────────────────────────────────────

class MealMacroData {
  const MealMacroData({
    required this.calorieRange,
    required this.proteinRange,
    required this.carbsRange,
    required this.fatRange,
    required this.alerts,
  });

  final String calorieRange;
  final String proteinRange;
  final String carbsRange;
  final String fatRange;
  final List<String> alerts;

  factory MealMacroData.fromJson(Map<String, dynamic> json) {
    return MealMacroData(
      calorieRange: json['calorieRange'] as String,
      proteinRange: json['proteinRange'] as String,
      carbsRange: json['carbsRange'] as String,
      fatRange: json['fatRange'] as String,
      alerts: List<String>.from(json['alerts'] as List? ?? []),
    );
  }
}

class MealResultMeta {
  const MealResultMeta({
    required this.userId,
    required this.analyzedAt,
    required this.logId,
  });

  final String userId;
  final DateTime analyzedAt;
  final String logId;

  factory MealResultMeta.fromJson(Map<String, dynamic> json) {
    return MealResultMeta(
      userId: json['userId'] as String,
      analyzedAt: DateTime.parse(json['analyzedAt'] as String),
      logId: json['logId'] as String,
    );
  }
}

class MealResult {
  const MealResult({required this.data, required this.meta});
  final MealMacroData data;
  final MealResultMeta meta;

  factory MealResult.fromJson(Map<String, dynamic> json) {
    return MealResult(
      data: MealMacroData.fromJson(json['data'] as Map<String, dynamic>),
      meta: MealResultMeta.fromJson(json['meta'] as Map<String, dynamic>),
    );
  }
}

// ─── Calculated Targets ───────────────────────────────────────────────────────

class CalculatedTargets {
  const CalculatedTargets({
    required this.dailyCalorieGoal,
    required this.targetProteinG,
    required this.targetCarbsG,
    required this.targetFatG,
  });

  final double dailyCalorieGoal;
  final double targetProteinG;
  final double targetCarbsG;
  final double targetFatG;

  factory CalculatedTargets.fromJson(Map<String, dynamic> json) {
    return CalculatedTargets(
      dailyCalorieGoal: (json['daily_calorie_goal'] as num).toDouble(),
      targetProteinG: (json['target_protein_g'] as num).toDouble(),
      targetCarbsG: (json['target_carbs_g'] as num).toDouble(),
      targetFatG: (json['target_fat_g'] as num).toDouble(),
    );
  }
}
