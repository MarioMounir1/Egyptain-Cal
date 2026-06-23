import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:go_router/go_router.dart';
import 'package:egyptian_cal/core/theme/app_theme.dart';
import 'package:egyptian_cal/core/providers/providers.dart';

class AddFoodScreen extends ConsumerStatefulWidget {
  const AddFoodScreen({super.key});

  @override
  ConsumerState<AddFoodScreen> createState() => _AddFoodScreenState();
}

class _AddFoodScreenState extends ConsumerState<AddFoodScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameCtrl = TextEditingController();
  final _nameEnCtrl = TextEditingController();
  final _categoryCtrl = TextEditingController();
  final _servingCtrl = TextEditingController();
  final _caloriesCtrl = TextEditingController();
  final _proteinCtrl = TextEditingController();
  final _carbsCtrl = TextEditingController();
  final _fatCtrl = TextEditingController();

  bool _isSaving = false;

  @override
  void dispose() {
    _nameCtrl.dispose();
    _nameEnCtrl.dispose();
    _categoryCtrl.dispose();
    _servingCtrl.dispose();
    _caloriesCtrl.dispose();
    _proteinCtrl.dispose();
    _carbsCtrl.dispose();
    _fatCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _isSaving = true);

    try {
      await ref.read(apiServiceProvider).createFood(
            name: _nameCtrl.text.trim(),
            nameEn: _nameEnCtrl.text.trim().isEmpty ? null : _nameEnCtrl.text.trim(),
            category: _categoryCtrl.text.trim().isEmpty ? null : _categoryCtrl.text.trim(),
            servingDesc: _servingCtrl.text.trim().isEmpty ? null : _servingCtrl.text.trim(),
            calories: int.parse(_caloriesCtrl.text),
            protein: double.parse(_proteinCtrl.text),
            carbs: double.parse(_carbsCtrl.text),
            fat: double.parse(_fatCtrl.text),
          );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Food added successfully! ✓')),
        );
        context.go('/foods');
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error: $e'),
            backgroundColor: AppColors.error,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Add Food'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded),
          onPressed: () => context.go('/foods'),
        ),
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(24),
          children: [
            _InfoBanner(),
            const SizedBox(height: 24),
            _SectionLabel(text: 'Food Name *'),
            const SizedBox(height: 8),
            TextFormField(
              controller: _nameCtrl,
              textDirection: TextDirection.rtl,
              decoration: const InputDecoration(
                hintText: 'e.g. كشري',
                hintTextDirection: TextDirection.rtl,
                prefixIcon: Icon(Icons.translate_rounded),
              ),
              validator: (v) {
                if (v == null || v.trim().length < 2) {
                  return 'Name must be at least 2 characters';
                }
                return null;
              },
            ).animate().fadeIn(delay: 100.ms),
            const SizedBox(height: 12),
            TextFormField(
              controller: _nameEnCtrl,
              decoration: const InputDecoration(
                labelText: 'English Name (optional)',
                hintText: 'e.g. Koshari',
                prefixIcon: Icon(Icons.abc_rounded),
              ),
            ).animate().fadeIn(delay: 150.ms),
            const SizedBox(height: 24),
            _SectionLabel(text: 'Details'),
            const SizedBox(height: 8),
            TextFormField(
              controller: _categoryCtrl,
              decoration: const InputDecoration(
                labelText: 'Category (optional)',
                hintText: 'e.g. Egyptian street food',
                prefixIcon: Icon(Icons.category_outlined),
              ),
            ).animate().fadeIn(delay: 200.ms),
            const SizedBox(height: 12),
            TextFormField(
              controller: _servingCtrl,
              decoration: const InputDecoration(
                labelText: 'Serving Description (optional)',
                hintText: 'e.g. 1 medium plate (400g)',
                prefixIcon: Icon(Icons.restaurant_menu_outlined),
              ),
            ).animate().fadeIn(delay: 250.ms),
            const SizedBox(height: 24),
            _SectionLabel(text: 'Nutritional Values (per serving) *'),
            const SizedBox(height: 8),
            _NutritionGrid(
              caloriesCtrl: _caloriesCtrl,
              proteinCtrl: _proteinCtrl,
              carbsCtrl: _carbsCtrl,
              fatCtrl: _fatCtrl,
            ).animate().fadeIn(delay: 300.ms),
            const SizedBox(height: 16),
            _RangeInfo(),
            const SizedBox(height: 32),
            ElevatedButton.icon(
              onPressed: _isSaving ? null : _submit,
              icon: _isSaving
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(
                          strokeWidth: 2,
                          valueColor: AlwaysStoppedAnimation(Colors.white)),
                    )
                  : const Icon(Icons.add_rounded),
              label: Text(_isSaving ? 'Saving...' : 'Add to Database'),
              style: ElevatedButton.styleFrom(
                minimumSize: const Size(double.infinity, 52),
              ),
            ).animate().fadeIn(delay: 400.ms),
          ],
        ),
      ),
    );
  }
}

class _InfoBanner extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.secondary.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.secondary.withOpacity(0.25)),
      ),
      child: Row(
        children: [
          const Icon(Icons.info_outline_rounded, color: AppColors.secondary, size: 18),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              'Macro min/max ranges are automatically calculated as midpoint ±5%.',
              style: GoogleFonts.poppins(
                fontSize: 12,
                color: AppColors.secondary,
                height: 1.4,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _RangeInfo extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.surfaceVariant,
        borderRadius: BorderRadius.circular(10),
      ),
      child: Row(
        children: [
          const Icon(Icons.auto_fix_high_rounded, color: AppColors.primary, size: 16),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              'Example: 480 kcal → stored as 456–504 kcal range',
              style: GoogleFonts.poppins(
                fontSize: 12,
                color: AppColors.textMuted,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _SectionLabel extends StatelessWidget {
  const _SectionLabel({required this.text});
  final String text;

  @override
  Widget build(BuildContext context) {
    return Text(
      text.toUpperCase(),
      style: GoogleFonts.poppins(
        fontSize: 11,
        fontWeight: FontWeight.w600,
        color: AppColors.textMuted,
        letterSpacing: 1.2,
      ),
    );
  }
}

class _NutritionGrid extends StatelessWidget {
  const _NutritionGrid({
    required this.caloriesCtrl,
    required this.proteinCtrl,
    required this.carbsCtrl,
    required this.fatCtrl,
  });
  final TextEditingController caloriesCtrl;
  final TextEditingController proteinCtrl;
  final TextEditingController carbsCtrl;
  final TextEditingController fatCtrl;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        _NutritionField(
          controller: caloriesCtrl,
          label: 'Calories',
          unit: 'kcal',
          color: AppColors.calories,
          icon: Icons.local_fire_department_rounded,
          isInteger: true,
        ),
        const SizedBox(height: 10),
        Row(
          children: [
            Expanded(
              child: _NutritionField(
                controller: proteinCtrl,
                label: 'Protein',
                unit: 'g',
                color: AppColors.protein,
                icon: Icons.fitness_center_rounded,
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: _NutritionField(
                controller: carbsCtrl,
                label: 'Carbs',
                unit: 'g',
                color: AppColors.carbs,
                icon: Icons.grain_rounded,
              ),
            ),
          ],
        ),
        const SizedBox(height: 10),
        _NutritionField(
          controller: fatCtrl,
          label: 'Fat',
          unit: 'g',
          color: AppColors.fat,
          icon: Icons.water_drop_rounded,
        ),
      ],
    );
  }
}

class _NutritionField extends StatelessWidget {
  const _NutritionField({
    required this.controller,
    required this.label,
    required this.unit,
    required this.color,
    required this.icon,
    this.isInteger = false,
  });
  final TextEditingController controller;
  final String label;
  final String unit;
  final Color color;
  final IconData icon;
  final bool isInteger;

  @override
  Widget build(BuildContext context) {
    return TextFormField(
      controller: controller,
      keyboardType: isInteger
          ? TextInputType.number
          : const TextInputType.numberWithOptions(decimal: true),
      inputFormatters: isInteger
          ? [FilteringTextInputFormatter.digitsOnly]
          : [FilteringTextInputFormatter.allow(RegExp(r'[\d.]'))],
      decoration: InputDecoration(
        labelText: label,
        suffixText: unit,
        prefixIcon: Icon(icon, color: color, size: 20),
      ),
      validator: (v) {
        if (v == null || v.isEmpty) return '$label is required';
        final n = double.tryParse(v);
        if (n == null || n < 0) return 'Must be ≥ 0';
        return null;
      },
    );
  }
}
