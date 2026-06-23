import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:egyptian_cal/core/theme/app_theme.dart';
import 'package:egyptian_cal/core/providers/providers.dart';
import 'package:egyptian_cal/core/models/models.dart';

class ProfileScreen extends ConsumerStatefulWidget {
  const ProfileScreen({super.key});

  @override
  ConsumerState<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends ConsumerState<ProfileScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameCtrl = TextEditingController();
  final _weightCtrl = TextEditingController();
  final _heightCtrl = TextEditingController();
  final _ageCtrl = TextEditingController();

  String _gender = 'male';
  String _activityLevel = 'moderately_active';
  String _goal = 'lose_weight';
  bool _isSaving = false;
  UserProfile? _profile;

  @override
  void dispose() {
    _nameCtrl.dispose();
    _weightCtrl.dispose();
    _heightCtrl.dispose();
    _ageCtrl.dispose();
    super.dispose();
  }

  void _populateForm(UserProfile profile) {
    _nameCtrl.text = profile.displayName;
    _weightCtrl.text = profile.weightKg?.toString() ?? '';
    _heightCtrl.text = profile.heightCm?.toString() ?? '';
    _ageCtrl.text = profile.age?.toString() ?? '';
    _gender = profile.gender ?? 'male';
    _activityLevel = profile.activityLevel ?? 'moderately_active';
    _goal = profile.goal ?? 'lose_weight';
  }

  Future<void> _saveProfile() async {
    if (!_formKey.currentState!.validate()) return;
    final userId = ref.read(userIdProvider);
    if (userId == null) return;

    setState(() => _isSaving = true);
    try {
      final updated = await ref.read(apiServiceProvider).updateUser(userId, {
        'display_name': _nameCtrl.text.trim(),
        if (_weightCtrl.text.isNotEmpty) 'weight_kg': double.parse(_weightCtrl.text),
        if (_heightCtrl.text.isNotEmpty) 'height_cm': double.parse(_heightCtrl.text),
        if (_ageCtrl.text.isNotEmpty) 'age': int.parse(_ageCtrl.text),
        'gender': _gender,
        'activity_level': _activityLevel,
        'goal': _goal,
      });
      ref.invalidate(userProfileProvider);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Profile updated ✓')),
        );
        setState(() => _profile = updated);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e'), backgroundColor: AppColors.error),
        );
      }
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final profileAsync = ref.watch(userProfileProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('My Profile'),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 16),
            child: TextButton(
              onPressed: _isSaving ? null : _saveProfile,
              child: _isSaving
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Text('Save'),
            ),
          ),
        ],
      ),
      body: profileAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('Error: $e')),
        data: (profile) {
          if (profile != null && _profile == null) {
            _profile = profile;
            WidgetsBinding.instance.addPostFrameCallback((_) => _populateForm(profile));
          }
          return _buildForm(profile);
        },
      ),
    );
  }

  Widget _buildForm(UserProfile? profile) {
    return Form(
      key: _formKey,
      child: ListView(
        padding: const EdgeInsets.all(24),
        children: [
          if (profile != null) _buildTargetsSummary(profile),
          const SizedBox(height: 28),
          _SectionHeader(title: 'Basic Info'),
          const SizedBox(height: 12),
          TextFormField(
            controller: _nameCtrl,
            decoration: const InputDecoration(
              labelText: 'Display Name',
              prefixIcon: Icon(Icons.person_outline_rounded),
            ),
            validator: (v) =>
                v == null || v.trim().isEmpty ? 'Name is required' : null,
          ),
          const SizedBox(height: 28),
          _SectionHeader(title: 'Body Metrics'),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: TextFormField(
                  controller: _weightCtrl,
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                  inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'[\d.]'))],
                  decoration: const InputDecoration(
                    labelText: 'Weight',
                    suffixText: 'kg',
                    prefixIcon: Icon(Icons.monitor_weight_outlined),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: TextFormField(
                  controller: _heightCtrl,
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                  inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'[\d.]'))],
                  decoration: const InputDecoration(
                    labelText: 'Height',
                    suffixText: 'cm',
                    prefixIcon: Icon(Icons.height_rounded),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          TextFormField(
            controller: _ageCtrl,
            keyboardType: TextInputType.number,
            inputFormatters: [FilteringTextInputFormatter.digitsOnly],
            decoration: const InputDecoration(
              labelText: 'Age',
              suffixText: 'years',
              prefixIcon: Icon(Icons.cake_outlined),
            ),
          ),
          const SizedBox(height: 28),
          _SectionHeader(title: 'Gender'),
          const SizedBox(height: 12),
          _buildGenderSelector(),
          const SizedBox(height: 28),
          _SectionHeader(title: 'Activity Level'),
          const SizedBox(height: 12),
          _buildActivityDropdown(),
          const SizedBox(height: 28),
          _SectionHeader(title: 'Goal'),
          const SizedBox(height: 12),
          _buildGoalSelector(),
          const SizedBox(height: 32),
          ElevatedButton(
            onPressed: _isSaving ? null : _saveProfile,
            style: ElevatedButton.styleFrom(
              minimumSize: const Size(double.infinity, 52),
            ),
            child: _isSaving
                ? const CircularProgressIndicator(
                    strokeWidth: 2,
                    valueColor: AlwaysStoppedAnimation(Colors.white),
                  )
                : const Text('Save Changes'),
          ),
        ],
      ),
    );
  }

  Widget _buildTargetsSummary(UserProfile profile) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            AppColors.primary.withOpacity(0.15),
            AppColors.primaryDark.withOpacity(0.08),
          ],
        ),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.primary.withOpacity(0.25)),
      ),
      child: Column(
        children: [
          Row(
            children: [
              const Icon(Icons.track_changes_rounded, color: AppColors.primary, size: 20),
              const SizedBox(width: 8),
              Text('Your Current Targets',
                  style: GoogleFonts.poppins(
                      fontWeight: FontWeight.w600,
                      color: AppColors.primary,
                      fontSize: 14)),
            ],
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              _TargetPill(
                label: 'Calories',
                value: profile.dailyCalorieGoal != null
                    ? '${profile.dailyCalorieGoal!.toInt()} kcal'
                    : '—',
                color: AppColors.calories,
              ),
              const SizedBox(width: 8),
              _TargetPill(
                label: 'Protein',
                value: profile.targetProteinG != null
                    ? '${profile.targetProteinG!.toStringAsFixed(0)}g'
                    : '—',
                color: AppColors.protein,
              ),
              const SizedBox(width: 8),
              _TargetPill(
                label: 'Carbs',
                value: profile.targetCarbsG != null
                    ? '${profile.targetCarbsG!.toStringAsFixed(0)}g'
                    : '—',
                color: AppColors.carbs,
              ),
              const SizedBox(width: 8),
              _TargetPill(
                label: 'Fat',
                value: profile.targetFatG != null
                    ? '${profile.targetFatG!.toStringAsFixed(0)}g'
                    : '—',
                color: AppColors.fat,
              ),
            ],
          ),
        ],
      ),
    ).animate().fadeIn().slideY(begin: -0.1);
  }

  Widget _buildGenderSelector() {
    return Row(
      children: [
        for (final g in [
          ('male', 'Male', Icons.male_rounded),
          ('female', 'Female', Icons.female_rounded),
          ('other', 'Other', Icons.person_rounded),
        ])
          Expanded(
            child: Padding(
              padding: EdgeInsets.only(right: g.$1 == 'other' ? 0 : 8),
              child: GestureDetector(
                onTap: () => setState(() => _gender = g.$1),
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 200),
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  decoration: BoxDecoration(
                    color: _gender == g.$1
                        ? AppColors.primary.withOpacity(0.12)
                        : AppColors.surfaceVariant,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(
                      color: _gender == g.$1 ? AppColors.primary : AppColors.border,
                      width: _gender == g.$1 ? 2 : 1,
                    ),
                  ),
                  child: Column(
                    children: [
                      Icon(g.$3,
                          color: _gender == g.$1
                              ? AppColors.primary
                              : AppColors.textMuted,
                          size: 22),
                      const SizedBox(height: 4),
                      Text(g.$2,
                          style: GoogleFonts.poppins(
                              fontSize: 12,
                              color: _gender == g.$1
                                  ? AppColors.primary
                                  : AppColors.textSecondary,
                              fontWeight: _gender == g.$1
                                  ? FontWeight.w600
                                  : FontWeight.w400)),
                    ],
                  ),
                ),
              ),
            ),
          ),
      ],
    );
  }

  Widget _buildActivityDropdown() {
    const options = [
      ('sedentary', 'Sedentary', '×1.2'),
      ('lightly_active', 'Lightly Active', '×1.375'),
      ('moderately_active', 'Moderately Active', '×1.55'),
      ('very_active', 'Very Active', '×1.725'),
      ('extra_active', 'Extra Active', '×1.9'),
    ];
    return DropdownButtonFormField<String>(
      value: _activityLevel,
      dropdownColor: AppColors.surfaceVariant,
      decoration: const InputDecoration(
        prefixIcon: Icon(Icons.directions_run_rounded),
      ),
      style: GoogleFonts.poppins(color: AppColors.textPrimary, fontSize: 14),
      items: options
          .map((o) => DropdownMenuItem(
                value: o.$1,
                child: Text('${o.$2} (${o.$3})'),
              ))
          .toList(),
      onChanged: (v) => setState(() => _activityLevel = v ?? _activityLevel),
    );
  }

  Widget _buildGoalSelector() {
    return Column(
      children: [
        for (final g in [
          ('lose_weight', 'Lose Weight', Icons.trending_down_rounded, AppColors.secondary),
          ('maintain_weight', 'Maintain', Icons.trending_flat_rounded, AppColors.primary),
          ('gain_weight', 'Gain Weight', Icons.trending_up_rounded, AppColors.protein),
        ])
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: GestureDetector(
              onTap: () => setState(() => _goal = g.$1),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                decoration: BoxDecoration(
                  color: _goal == g.$1
                      ? g.$4.withOpacity(0.1)
                      : AppColors.surfaceVariant,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: _goal == g.$1 ? g.$4 : AppColors.border,
                    width: _goal == g.$1 ? 2 : 1,
                  ),
                ),
                child: Row(
                  children: [
                    Icon(g.$3,
                        color: _goal == g.$1 ? g.$4 : AppColors.textMuted,
                        size: 24),
                    const SizedBox(width: 12),
                    Text(g.$2,
                        style: GoogleFonts.poppins(
                            fontWeight: FontWeight.w600,
                            color: _goal == g.$1
                                ? g.$4
                                : AppColors.textPrimary,
                            fontSize: 14)),
                    const Spacer(),
                    if (_goal == g.$1)
                      Icon(Icons.check_circle_rounded, color: g.$4, size: 20),
                  ],
                ),
              ),
            ),
          ),
      ],
    );
  }
}

class _SectionHeader extends StatelessWidget {
  const _SectionHeader({required this.title});
  final String title;

  @override
  Widget build(BuildContext context) {
    return Text(
      title.toUpperCase(),
      style: GoogleFonts.poppins(
        fontSize: 11,
        fontWeight: FontWeight.w600,
        color: AppColors.textMuted,
        letterSpacing: 1.2,
      ),
    );
  }
}

class _TargetPill extends StatelessWidget {
  const _TargetPill({
    required this.label,
    required this.value,
    required this.color,
  });
  final String label;
  final String value;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 6),
        decoration: BoxDecoration(
          color: color.withOpacity(0.1),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Column(
          children: [
            Text(value,
                style: GoogleFonts.poppins(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: color)),
            Text(label,
                style: GoogleFonts.poppins(
                    fontSize: 10,
                    color: AppColors.textMuted)),
          ],
        ),
      ),
    );
  }
}
