import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:egyptian_cal/core/theme/app_theme.dart';
import 'package:egyptian_cal/core/models/models.dart';

class MealResultCard extends StatelessWidget {
  const MealResultCard({super.key, required this.result});
  final MealResult result;

  @override
  Widget build(BuildContext context) {
    final data = result.data;

    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            AppColors.primary.withOpacity(0.12),
            AppColors.secondary.withOpacity(0.06),
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: AppColors.primary.withOpacity(0.2)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Container(
            padding: const EdgeInsets.fromLTRB(20, 20, 20, 16),
            decoration: BoxDecoration(
              color: AppColors.primary.withOpacity(0.08),
              borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
            ),
            child: Row(
              children: [
                Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: AppColors.primary.withOpacity(0.15),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(Icons.auto_awesome_rounded,
                      color: AppColors.primary, size: 20),
                ),
                const SizedBox(width: 12),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Analysis Result',
                        style: GoogleFonts.poppins(
                            fontWeight: FontWeight.w700,
                            color: AppColors.textPrimary,
                            fontSize: 16)),
                    Text(
                      'Analyzed at ${_formatTime(result.meta.analyzedAt)}',
                      style: GoogleFonts.poppins(
                          fontSize: 12, color: AppColors.textMuted),
                    ),
                  ],
                ),
                const Spacer(),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: AppColors.success.withOpacity(0.15),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text('AI',
                      style: GoogleFonts.poppins(
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          color: AppColors.success)),
                ),
              ],
            ),
          ),
          // Calories
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 20, 20, 0),
            child: _CalorieRow(range: data.calorieRange)
                .animate()
                .fadeIn(delay: 100.ms)
                .slideY(begin: 0.15),
          ),
          // Macros
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 12, 20, 0),
            child: Row(
              children: [
                Expanded(
                  child: _MacroRangeChip(
                    label: 'Protein',
                    range: data.proteinRange,
                    color: AppColors.protein,
                    icon: Icons.fitness_center_rounded,
                  ).animate().fadeIn(delay: 200.ms).slideY(begin: 0.15),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: _MacroRangeChip(
                    label: 'Carbs',
                    range: data.carbsRange,
                    color: AppColors.carbs,
                    icon: Icons.grain_rounded,
                  ).animate().fadeIn(delay: 300.ms).slideY(begin: 0.15),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: _MacroRangeChip(
                    label: 'Fat',
                    range: data.fatRange,
                    color: AppColors.fat,
                    icon: Icons.water_drop_rounded,
                  ).animate().fadeIn(delay: 400.ms).slideY(begin: 0.15),
                ),
              ],
            ),
          ),
          // Alerts
          if (data.alerts.isNotEmpty)
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Notes',
                      style: GoogleFonts.poppins(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: AppColors.textMuted,
                          letterSpacing: 0.8)),
                  const SizedBox(height: 8),
                  ...data.alerts.asMap().entries.map(
                        (e) => Padding(
                          padding: const EdgeInsets.only(bottom: 6),
                          child: _AlertRow(text: e.value)
                              .animate()
                              .fadeIn(delay: (500 + e.key * 80).ms),
                        ),
                      ),
                ],
              ),
            )
          else
            const SizedBox(height: 20),
        ],
      ),
    );
  }

  String _formatTime(DateTime dt) {
    final h = dt.hour.toString().padLeft(2, '0');
    final m = dt.minute.toString().padLeft(2, '0');
    return '$h:$m';
  }
}

class _CalorieRow extends StatelessWidget {
  const _CalorieRow({required this.range});
  final String range;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: BoxDecoration(
        color: AppColors.calories.withOpacity(0.1),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.calories.withOpacity(0.2)),
      ),
      child: Row(
        children: [
          const Icon(Icons.local_fire_department_rounded,
              color: AppColors.calories, size: 22),
          const SizedBox(width: 10),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Calories',
                  style: GoogleFonts.poppins(
                      fontSize: 12, color: AppColors.textMuted)),
              Text('$range kcal',
                  style: GoogleFonts.poppins(
                      fontSize: 20,
                      fontWeight: FontWeight.w800,
                      color: AppColors.calories)),
            ],
          ),
        ],
      ),
    );
  }
}

class _MacroRangeChip extends StatelessWidget {
  const _MacroRangeChip({
    required this.label,
    required this.range,
    required this.color,
    required this.icon,
  });
  final String label;
  final String range;
  final Color color;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        children: [
          Icon(icon, color: color, size: 18),
          const SizedBox(height: 6),
          Text(label,
              style: GoogleFonts.poppins(fontSize: 10, color: AppColors.textMuted)),
          const SizedBox(height: 2),
          Text(range,
              style: GoogleFonts.poppins(
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                  color: color),
              textAlign: TextAlign.center),
        ],
      ),
    );
  }
}

class _AlertRow extends StatelessWidget {
  const _AlertRow({required this.text});
  final String text;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: AppColors.surfaceVariant,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        text,
        style: GoogleFonts.poppins(fontSize: 12, color: AppColors.textSecondary, height: 1.4),
      ),
    );
  }
}
