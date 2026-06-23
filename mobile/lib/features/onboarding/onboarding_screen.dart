import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:uuid/uuid.dart';
import 'package:egyptian_cal/core/theme/app_theme.dart';
import 'package:egyptian_cal/core/providers/providers.dart';
import 'package:egyptian_cal/core/models/models.dart';

class OnboardingScreen extends ConsumerStatefulWidget {
  const OnboardingScreen({super.key});

  @override
  ConsumerState<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends ConsumerState<OnboardingScreen> {
  final _pageController = PageController();
  int _currentPage = 0;

  // Form controllers
  final _nameCtrl = TextEditingController();
  final _weightCtrl = TextEditingController();
  final _heightCtrl = TextEditingController();
  final _ageCtrl = TextEditingController();

  String _gender = 'male';
  String _activityLevel = 'moderately_active';
  String _goal = 'lose_weight';

  CalculatedTargets? _previewTargets;
  bool _isCalculating = false;
  bool _isSaving = false;

  @override
  void dispose() {
    _pageController.dispose();
    _nameCtrl.dispose();
    _weightCtrl.dispose();
    _heightCtrl.dispose();
    _ageCtrl.dispose();
    super.dispose();
  }

  Future<void> _calculatePreview() async {
    final w = double.tryParse(_weightCtrl.text);
    final h = double.tryParse(_heightCtrl.text);
    final a = int.tryParse(_ageCtrl.text);
    if (w == null || h == null || a == null) return;

    setState(() => _isCalculating = true);
    try {
      final targets = await ref.read(apiServiceProvider).calculateTargets(
            weightKg: w,
            heightCm: h,
            age: a,
            gender: _gender,
            activityLevel: _activityLevel,
            goal: _goal,
          );
      setState(() => _previewTargets = targets);
    } catch (_) {
    } finally {
      setState(() => _isCalculating = false);
    }
  }

  Future<void> _finish() async {
    final prefs = ref.read(sharedPreferencesProvider);
    final existingId = prefs.getString('user_id');
    final userId = existingId ?? const Uuid().v4();

    setState(() => _isSaving = true);
    try {
      final api = ref.read(apiServiceProvider);
      final w = double.tryParse(_weightCtrl.text);
      final h = double.tryParse(_heightCtrl.text);
      final a = int.tryParse(_ageCtrl.text);

      if (existingId == null) {
        // Save user ID first (no register endpoint, so we create a stub)
        await prefs.setString('user_id', userId);
      }

      if (w != null && h != null && a != null) {
        await api.updateUser(userId, {
          'display_name': _nameCtrl.text.trim().isEmpty ? 'User' : _nameCtrl.text.trim(),
          'weight_kg': w,
          'height_cm': h,
          'age': a,
          'gender': _gender,
          'activity_level': _activityLevel,
          'goal': _goal,
        });
      }

      ref.read(userIdProvider.notifier).state = userId;
    } catch (e) {
      // If server fails, still save locally
      await prefs.setString('user_id', userId);
      ref.read(userIdProvider.notifier).state = userId;
    } finally {
      setState(() => _isSaving = false);
    }
  }

  void _nextPage() {
    if (_currentPage < 3) {
      _pageController.nextPage(
        duration: const Duration(milliseconds: 400),
        curve: Curves.easeInOut,
      );
    } else {
      _finish();
    }
  }

  void _prevPage() {
    if (_currentPage > 0) {
      _pageController.previousPage(
        duration: const Duration(milliseconds: 400),
        curve: Curves.easeInOut,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Column(
          children: [
            _buildHeader(),
            Expanded(
              child: PageView(
                controller: _pageController,
                physics: const NeverScrollableScrollPhysics(),
                onPageChanged: (i) => setState(() => _currentPage = i),
                children: [
                  _WelcomePage(nameCtrl: _nameCtrl),
                  _MetricsPage(
                    weightCtrl: _weightCtrl,
                    heightCtrl: _heightCtrl,
                    ageCtrl: _ageCtrl,
                    gender: _gender,
                    onGenderChanged: (v) => setState(() => _gender = v),
                  ),
                  _ActivityGoalPage(
                    activityLevel: _activityLevel,
                    goal: _goal,
                    onActivityChanged: (v) => setState(() {
                      _activityLevel = v;
                      _previewTargets = null;
                    }),
                    onGoalChanged: (v) => setState(() {
                      _goal = v;
                      _previewTargets = null;
                    }),
                  ),
                  _PreviewPage(
                    targets: _previewTargets,
                    isCalculating: _isCalculating,
                    onCalculate: _calculatePreview,
                  ),
                ],
              ),
            ),
            _buildNavButtons(),
          ],
        ),
      ),
    );
  }

  Widget _buildHeader() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(24, 24, 24, 0),
      child: Column(
        children: [
          Row(
            children: [
              _buildLogo(),
              const Spacer(),
              Text(
                '${_currentPage + 1} / 4',
                style: GoogleFonts.poppins(
                  color: AppColors.textMuted,
                  fontSize: 13,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: (_currentPage + 1) / 4,
              backgroundColor: AppColors.surfaceVariant,
              valueColor: const AlwaysStoppedAnimation<Color>(AppColors.primary),
              minHeight: 4,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLogo() {
    return Row(
      children: [
        Container(
          width: 36,
          height: 36,
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              colors: [AppColors.primary, AppColors.primaryLight],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.circular(10),
          ),
          child: const Icon(Icons.local_fire_department, color: Colors.white, size: 20),
        ),
        const SizedBox(width: 10),
        Text(
          'Egyptian Cal',
          style: GoogleFonts.poppins(
            color: AppColors.textPrimary,
            fontSize: 18,
            fontWeight: FontWeight.w700,
          ),
        ),
      ],
    );
  }

  Widget _buildNavButtons() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(24, 16, 24, 24),
      child: Row(
        children: [
          if (_currentPage > 0)
            Expanded(
              child: OutlinedButton(
                onPressed: _prevPage,
                child: const Text('Back'),
              ),
            ),
          if (_currentPage > 0) const SizedBox(width: 12),
          Expanded(
            flex: 2,
            child: ElevatedButton(
              onPressed: _isSaving ? null : _nextPage,
              child: _isSaving
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        valueColor: AlwaysStoppedAnimation(Colors.white),
                      ),
                    )
                  : Text(_currentPage == 3 ? 'Get Started 🚀' : 'Continue'),
            ),
          ),
        ],
      ),
    );
  }
}

// ─── Page 1: Welcome ──────────────────────────────────────────────────────────

class _WelcomePage extends StatelessWidget {
  const _WelcomePage({required this.nameCtrl});
  final TextEditingController nameCtrl;

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SizedBox(height: 32),
          Text(
            'مرحباً! 👋',
            style: GoogleFonts.cairo(
              fontSize: 40,
              fontWeight: FontWeight.w800,
              color: AppColors.primary,
            ),
          ).animate().fadeIn(delay: 100.ms).slideX(begin: -0.2),
          const SizedBox(height: 8),
          Text(
            'Welcome to Egyptian Cal',
            style: GoogleFonts.poppins(
              fontSize: 22,
              fontWeight: FontWeight.w700,
              color: AppColors.textPrimary,
            ),
          ).animate().fadeIn(delay: 200.ms).slideX(begin: -0.2),
          const SizedBox(height: 12),
          Text(
            'Your AI-powered nutrition tracker built for Egyptian food. Analyze meals in Arabic or English, track macros, and reach your goals.',
            style: GoogleFonts.poppins(
              fontSize: 14,
              color: AppColors.textMuted,
              height: 1.6,
            ),
          ).animate().fadeIn(delay: 300.ms),
          const SizedBox(height: 40),
          _FeatureRow(
            icon: Icons.restaurant_menu_rounded,
            color: AppColors.primary,
            title: 'Egyptian Food Database',
            desc: 'كشري، فول، طعمية والمزيد',
          ).animate().fadeIn(delay: 400.ms).slideY(begin: 0.2),
          const SizedBox(height: 16),
          _FeatureRow(
            icon: Icons.camera_alt_rounded,
            color: AppColors.secondary,
            title: 'AI Photo Analysis',
            desc: 'Snap your plate & get instant macros',
          ).animate().fadeIn(delay: 500.ms).slideY(begin: 0.2),
          const SizedBox(height: 16),
          _FeatureRow(
            icon: Icons.track_changes_rounded,
            color: AppColors.protein,
            title: 'Smart Macro Tracking',
            desc: 'Personalized to your body & goals',
          ).animate().fadeIn(delay: 600.ms).slideY(begin: 0.2),
          const SizedBox(height: 40),
          TextField(
            controller: nameCtrl,
            decoration: const InputDecoration(
              labelText: 'Your name (optional)',
              hintText: 'e.g. Ahmed, Mariam',
              prefixIcon: Icon(Icons.person_outline_rounded),
            ),
          ).animate().fadeIn(delay: 700.ms),
        ],
      ),
    );
  }
}

class _FeatureRow extends StatelessWidget {
  const _FeatureRow({
    required this.icon,
    required this.color,
    required this.title,
    required this.desc,
  });
  final IconData icon;
  final Color color;
  final String title;
  final String desc;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          width: 48,
          height: 48,
          decoration: BoxDecoration(
            color: color.withOpacity(0.15),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Icon(icon, color: color, size: 24),
        ),
        const SizedBox(width: 16),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title,
                  style: GoogleFonts.poppins(
                      fontWeight: FontWeight.w600,
                      color: AppColors.textPrimary,
                      fontSize: 14)),
              Text(desc,
                  style: GoogleFonts.poppins(
                      color: AppColors.textMuted, fontSize: 12)),
            ],
          ),
        ),
      ],
    );
  }
}

// ─── Page 2: Metrics ──────────────────────────────────────────────────────────

class _MetricsPage extends StatelessWidget {
  const _MetricsPage({
    required this.weightCtrl,
    required this.heightCtrl,
    required this.ageCtrl,
    required this.gender,
    required this.onGenderChanged,
  });
  final TextEditingController weightCtrl;
  final TextEditingController heightCtrl;
  final TextEditingController ageCtrl;
  final String gender;
  final ValueChanged<String> onGenderChanged;

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SizedBox(height: 24),
          Text('Your Body Metrics',
              style: GoogleFonts.poppins(
                  fontSize: 26,
                  fontWeight: FontWeight.w700,
                  color: AppColors.textPrimary)),
          const SizedBox(height: 8),
          Text('We use these to calculate your personalized calorie targets.',
              style: GoogleFonts.poppins(fontSize: 13, color: AppColors.textMuted)),
          const SizedBox(height: 32),
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: weightCtrl,
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
                child: TextField(
                  controller: heightCtrl,
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
          const SizedBox(height: 16),
          TextField(
            controller: ageCtrl,
            keyboardType: TextInputType.number,
            inputFormatters: [FilteringTextInputFormatter.digitsOnly],
            decoration: const InputDecoration(
              labelText: 'Age',
              suffixText: 'years',
              prefixIcon: Icon(Icons.cake_outlined),
            ),
          ),
          const SizedBox(height: 28),
          Text('Gender', style: GoogleFonts.poppins(fontWeight: FontWeight.w600, color: AppColors.textSecondary, fontSize: 13)),
          const SizedBox(height: 10),
          Row(
            children: [
              _GenderChip(label: 'Male', value: 'male', selected: gender == 'male', onTap: onGenderChanged),
              const SizedBox(width: 10),
              _GenderChip(label: 'Female', value: 'female', selected: gender == 'female', onTap: onGenderChanged),
              const SizedBox(width: 10),
              _GenderChip(label: 'Other', value: 'other', selected: gender == 'other', onTap: onGenderChanged),
            ],
          ),
        ],
      ),
    );
  }
}

class _GenderChip extends StatelessWidget {
  const _GenderChip({
    required this.label,
    required this.value,
    required this.selected,
    required this.onTap,
  });
  final String label;
  final String value;
  final bool selected;
  final ValueChanged<String> onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => onTap(value),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
        decoration: BoxDecoration(
          color: selected ? AppColors.primary.withOpacity(0.15) : AppColors.surfaceVariant,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
            color: selected ? AppColors.primary : AppColors.border,
            width: selected ? 2 : 1,
          ),
        ),
        child: Text(
          label,
          style: GoogleFonts.poppins(
            color: selected ? AppColors.primary : AppColors.textSecondary,
            fontWeight: selected ? FontWeight.w600 : FontWeight.w400,
            fontSize: 13,
          ),
        ),
      ),
    );
  }
}

// ─── Page 3: Activity & Goal ──────────────────────────────────────────────────

class _ActivityGoalPage extends StatelessWidget {
  const _ActivityGoalPage({
    required this.activityLevel,
    required this.goal,
    required this.onActivityChanged,
    required this.onGoalChanged,
  });
  final String activityLevel;
  final String goal;
  final ValueChanged<String> onActivityChanged;
  final ValueChanged<String> onGoalChanged;

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SizedBox(height: 24),
          Text('Activity & Goals',
              style: GoogleFonts.poppins(
                  fontSize: 26,
                  fontWeight: FontWeight.w700,
                  color: AppColors.textPrimary)),
          const SizedBox(height: 8),
          Text('This helps us fine-tune your daily calorie targets.',
              style: GoogleFonts.poppins(fontSize: 13, color: AppColors.textMuted)),
          const SizedBox(height: 32),
          Text('Activity Level',
              style: GoogleFonts.poppins(
                  fontWeight: FontWeight.w600,
                  color: AppColors.textSecondary,
                  fontSize: 13)),
          const SizedBox(height: 12),
          ...[
            ('sedentary', 'Sedentary', 'Little or no exercise', '×1.2'),
            ('lightly_active', 'Lightly Active', '1–3 days/week', '×1.375'),
            ('moderately_active', 'Moderately Active', '3–5 days/week', '×1.55'),
            ('very_active', 'Very Active', '6–7 days/week', '×1.725'),
            ('extra_active', 'Extra Active', 'Physical job', '×1.9'),
          ].map((item) => Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: _SelectionCard(
                  selected: activityLevel == item.$1,
                  onTap: () => onActivityChanged(item.$1),
                  title: item.$2,
                  subtitle: item.$3,
                  badge: item.$4,
                ),
              )),
          const SizedBox(height: 28),
          Text('Your Goal',
              style: GoogleFonts.poppins(
                  fontWeight: FontWeight.w600,
                  color: AppColors.textSecondary,
                  fontSize: 13)),
          const SizedBox(height: 12),
          ...[
            ('lose_weight', 'Lose Weight', 'TDEE − 500 kcal', Icons.trending_down_rounded, AppColors.secondary),
            ('maintain_weight', 'Maintain Weight', 'TDEE (no adjustment)', Icons.trending_flat_rounded, AppColors.primary),
            ('gain_weight', 'Gain Weight', 'TDEE + 500 kcal', Icons.trending_up_rounded, AppColors.protein),
          ].map((item) => Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: _GoalCard(
                  selected: goal == item.$1,
                  onTap: () => onGoalChanged(item.$1),
                  title: item.$2,
                  subtitle: item.$3,
                  icon: item.$4,
                  color: item.$5,
                ),
              )),
        ],
      ),
    );
  }
}

class _SelectionCard extends StatelessWidget {
  const _SelectionCard({
    required this.selected,
    required this.onTap,
    required this.title,
    required this.subtitle,
    required this.badge,
  });
  final bool selected;
  final VoidCallback onTap;
  final String title;
  final String subtitle;
  final String badge;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: BoxDecoration(
          color: selected ? AppColors.primary.withOpacity(0.1) : AppColors.surfaceVariant,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: selected ? AppColors.primary : AppColors.border,
            width: selected ? 2 : 1,
          ),
        ),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title,
                      style: GoogleFonts.poppins(
                          fontWeight: FontWeight.w600,
                          color: selected ? AppColors.primary : AppColors.textPrimary,
                          fontSize: 14)),
                  Text(subtitle,
                      style: GoogleFonts.poppins(fontSize: 12, color: AppColors.textMuted)),
                ],
              ),
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: AppColors.surfaceElevated,
                borderRadius: BorderRadius.circular(6),
              ),
              child: Text(badge,
                  style: GoogleFonts.poppins(
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      color: AppColors.textMuted)),
            ),
          ],
        ),
      ),
    );
  }
}

class _GoalCard extends StatelessWidget {
  const _GoalCard({
    required this.selected,
    required this.onTap,
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.color,
  });
  final bool selected;
  final VoidCallback onTap;
  final String title;
  final String subtitle;
  final IconData icon;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        decoration: BoxDecoration(
          color: selected ? color.withOpacity(0.1) : AppColors.surfaceVariant,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: selected ? color : AppColors.border,
            width: selected ? 2 : 1,
          ),
        ),
        child: Row(
          children: [
            Icon(icon, color: selected ? color : AppColors.textMuted, size: 28),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title,
                      style: GoogleFonts.poppins(
                          fontWeight: FontWeight.w600,
                          color: selected ? color : AppColors.textPrimary,
                          fontSize: 14)),
                  Text(subtitle,
                      style: GoogleFonts.poppins(fontSize: 12, color: AppColors.textMuted)),
                ],
              ),
            ),
            if (selected)
              Icon(Icons.check_circle_rounded, color: color, size: 20),
          ],
        ),
      ),
    );
  }
}

// ─── Page 4: Preview ──────────────────────────────────────────────────────────

class _PreviewPage extends StatelessWidget {
  const _PreviewPage({
    required this.targets,
    required this.isCalculating,
    required this.onCalculate,
  });
  final CalculatedTargets? targets;
  final bool isCalculating;
  final VoidCallback onCalculate;

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SizedBox(height: 24),
          Text('Your Targets',
              style: GoogleFonts.poppins(
                  fontSize: 26,
                  fontWeight: FontWeight.w700,
                  color: AppColors.textPrimary)),
          const SizedBox(height: 8),
          Text('Preview your personalized calorie & macro targets.',
              style: GoogleFonts.poppins(fontSize: 13, color: AppColors.textMuted)),
          const SizedBox(height: 24),
          if (targets == null && !isCalculating)
            OutlinedButton.icon(
              onPressed: onCalculate,
              icon: const Icon(Icons.calculate_rounded),
              label: const Text('Calculate My Targets'),
              style: OutlinedButton.styleFrom(
                minimumSize: const Size(double.infinity, 52),
              ),
            ),
          if (isCalculating)
            const Center(
              child: Padding(
                padding: EdgeInsets.all(32),
                child: CircularProgressIndicator(),
              ),
            ),
          if (targets != null) ...[
            _TargetCard(
              label: 'Daily Calories',
              value: '${targets!.dailyCalorieGoal.toInt()} kcal',
              color: AppColors.calories,
              icon: Icons.local_fire_department_rounded,
            ).animate().fadeIn().scale(begin: const Offset(0.9, 0.9)),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: _TargetCard(
                    label: 'Protein',
                    value: '${targets!.targetProteinG.toStringAsFixed(1)}g',
                    color: AppColors.protein,
                    icon: Icons.fitness_center_rounded,
                  ).animate().fadeIn(delay: 100.ms).scale(begin: const Offset(0.9, 0.9)),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _TargetCard(
                    label: 'Carbs',
                    value: '${targets!.targetCarbsG.toStringAsFixed(1)}g',
                    color: AppColors.carbs,
                    icon: Icons.grain_rounded,
                  ).animate().fadeIn(delay: 200.ms).scale(begin: const Offset(0.9, 0.9)),
                ),
              ],
            ),
            const SizedBox(height: 12),
            _TargetCard(
              label: 'Fat',
              value: '${targets!.targetFatG.toStringAsFixed(1)}g',
              color: AppColors.fat,
              icon: Icons.water_drop_rounded,
            ).animate().fadeIn(delay: 300.ms).scale(begin: const Offset(0.9, 0.9)),
            const SizedBox(height: 24),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.secondary.withOpacity(0.1),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.secondary.withOpacity(0.3)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.info_outline_rounded, color: AppColors.secondary, size: 20),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      'Macro split: 30% Protein / 40% Carbs / 30% Fat\nCalculated via Mifflin-St Jeor equation.',
                      style: GoogleFonts.poppins(
                        fontSize: 12,
                        color: AppColors.secondary,
                        height: 1.5,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _TargetCard extends StatelessWidget {
  const _TargetCard({
    required this.label,
    required this.value,
    required this.color,
    required this.icon,
  });
  final String label;
  final String value;
  final Color color;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: color.withOpacity(0.08),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: color.withOpacity(0.25)),
      ),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: color.withOpacity(0.15),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, color: color, size: 20),
          ),
          const SizedBox(width: 14),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label,
                  style: GoogleFonts.poppins(fontSize: 12, color: AppColors.textMuted)),
              Text(value,
                  style: GoogleFonts.poppins(
                      fontSize: 20,
                      fontWeight: FontWeight.w700,
                      color: color)),
            ],
          ),
        ],
      ),
    );
  }
}
