import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:go_router/go_router.dart';
import 'package:egyptian_cal/core/theme/app_theme.dart';
import 'package:egyptian_cal/core/providers/providers.dart';
import 'package:egyptian_cal/core/models/models.dart';

class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final profileAsync = ref.watch(userProfileProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: profileAsync.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (e, _) => _ErrorState(message: e.toString()),
          data: (profile) {
            if (profile == null) return const _NoProfileState();
            return _DashboardContent(profile: profile);
          },
        ),
      ),
    );
  }
}

class _DashboardContent extends StatelessWidget {
  const _DashboardContent({required this.profile});
  final UserProfile profile;

  @override
  Widget build(BuildContext context) {
    final calories = profile.dailyCalorieGoal ?? 2000;
    final protein = profile.targetProteinG ?? 150;
    final carbs = profile.targetCarbsG ?? 200;
    final fat = profile.targetFatG ?? 65;

    return CustomScrollView(
      slivers: [
        SliverToBoxAdapter(child: _buildHeader(context, profile)),
        SliverToBoxAdapter(child: _buildCalorieRing(calories)),
        SliverToBoxAdapter(child: _buildMacroCards(protein, carbs, fat)),
        SliverToBoxAdapter(child: _buildQuickActions(context)),
        SliverToBoxAdapter(child: _buildTips()),
        const SliverToBoxAdapter(child: SizedBox(height: 24)),
      ],
    );
  }

  Widget _buildHeader(BuildContext context, UserProfile profile) {
    final hour = DateTime.now().hour;
    String greeting;
    if (hour < 12) {
      greeting = 'صباح الخير ☀️';
    } else if (hour < 17) {
      greeting = 'مساء الخير 🌤️';
    } else {
      greeting = 'مساء النور 🌙';
    }

    return Padding(
      padding: const EdgeInsets.fromLTRB(24, 24, 24, 0),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  greeting,
                  style: GoogleFonts.cairo(
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                    color: AppColors.primary,
                  ),
                ).animate().fadeIn(delay: 100.ms),
                Text(
                  profile.displayName,
                  style: GoogleFonts.poppins(
                    fontSize: 26,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textPrimary,
                  ),
                ).animate().fadeIn(delay: 200.ms),
                Text(
                  'Here are your daily targets',
                  style: GoogleFonts.poppins(
                    fontSize: 13,
                    color: AppColors.textMuted,
                  ),
                ).animate().fadeIn(delay: 300.ms),
              ],
            ),
          ),
          GestureDetector(
            onTap: () => context.go('/profile'),
            child: Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [AppColors.primary, AppColors.primaryDark],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(14),
              ),
              child: Center(
                child: Text(
                  profile.displayName.isNotEmpty
                      ? profile.displayName[0].toUpperCase()
                      : 'U',
                  style: GoogleFonts.poppins(
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                    color: Colors.white,
                  ),
                ),
              ),
            ),
          ).animate().fadeIn(delay: 400.ms),
        ],
      ),
    );
  }

  Widget _buildCalorieRing(double calories) {
    // Simulate consumed 60% of goal
    const consumed = 0.6;
    return Padding(
      padding: const EdgeInsets.all(24),
      child: Container(
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(24),
          border: Border.all(color: AppColors.border),
        ),
        child: Column(
          children: [
            Text(
              'Today\'s Calories',
              style: GoogleFonts.poppins(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: AppColors.textSecondary),
            ),
            const SizedBox(height: 20),
            SizedBox(
              height: 180,
              child: Stack(
                alignment: Alignment.center,
                children: [
                  PieChart(
                    PieChartData(
                      startDegreeOffset: -90,
                      sectionsSpace: 0,
                      centerSpaceRadius: 65,
                      sections: [
                        PieChartSectionData(
                          value: consumed * 100,
                          color: AppColors.primary,
                          radius: 20,
                          showTitle: false,
                        ),
                        PieChartSectionData(
                          value: (1 - consumed) * 100,
                          color: AppColors.surfaceVariant,
                          radius: 16,
                          showTitle: false,
                        ),
                      ],
                    ),
                  ),
                  Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        '${(calories * consumed).toInt()}',
                        style: GoogleFonts.poppins(
                          fontSize: 32,
                          fontWeight: FontWeight.w800,
                          color: AppColors.textPrimary,
                        ),
                      ),
                      Text(
                        'of ${calories.toInt()} kcal',
                        style: GoogleFonts.poppins(
                          fontSize: 12,
                          color: AppColors.textMuted,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ).animate().fadeIn(delay: 300.ms).scale(begin: const Offset(0.85, 0.85)),
            const SizedBox(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              children: [
                _RingLegend(color: AppColors.primary, label: 'Consumed'),
                _RingLegend(color: AppColors.surfaceVariant, label: 'Remaining'),
              ],
            ),
          ],
        ),
      ).animate().fadeIn(delay: 200.ms),
    );
  }

  Widget _buildMacroCards(double protein, double carbs, double fat) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Column(
        children: [
          Row(
            children: [
              Expanded(
                child: _MacroProgressCard(
                  label: 'Protein',
                  target: protein,
                  consumed: protein * 0.55,
                  color: AppColors.protein,
                  unit: 'g',
                ).animate().fadeIn(delay: 400.ms).slideY(begin: 0.2),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _MacroProgressCard(
                  label: 'Carbs',
                  target: carbs,
                  consumed: carbs * 0.65,
                  color: AppColors.carbs,
                  unit: 'g',
                ).animate().fadeIn(delay: 500.ms).slideY(begin: 0.2),
              ),
            ],
          ),
          const SizedBox(height: 12),
          _MacroProgressCard(
            label: 'Fat',
            target: fat,
            consumed: fat * 0.48,
            color: AppColors.fat,
            unit: 'g',
            horizontal: true,
          ).animate().fadeIn(delay: 600.ms).slideY(begin: 0.2),
        ],
      ),
    );
  }

  Widget _buildQuickActions(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(24, 28, 24, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Quick Actions',
              style: GoogleFonts.poppins(
                  fontWeight: FontWeight.w600,
                  color: AppColors.textSecondary,
                  fontSize: 13)).animate().fadeIn(delay: 700.ms),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: _ActionCard(
                  icon: Icons.chat_bubble_outline_rounded,
                  title: 'Text Analysis',
                  subtitle: 'Describe a meal',
                  color: AppColors.secondary,
                  onTap: () => context.go('/meals/text'),
                ).animate().fadeIn(delay: 800.ms).slideX(begin: -0.2),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _ActionCard(
                  icon: Icons.camera_alt_outlined,
                  title: 'Photo Analysis',
                  subtitle: 'Snap your food',
                  color: AppColors.protein,
                  onTap: () => context.go('/meals/photo'),
                ).animate().fadeIn(delay: 900.ms).slideX(begin: 0.2),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: _ActionCard(
                  icon: Icons.search_rounded,
                  title: 'Food Search',
                  subtitle: 'Browse database',
                  color: AppColors.carbs,
                  onTap: () => context.go('/foods'),
                ).animate().fadeIn(delay: 1000.ms).slideX(begin: -0.2),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _ActionCard(
                  icon: Icons.add_circle_outline_rounded,
                  title: 'Add Food',
                  subtitle: 'Create new entry',
                  color: AppColors.fat,
                  onTap: () => context.go('/foods/add'),
                ).animate().fadeIn(delay: 1100.ms).slideX(begin: 0.2),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildTips() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(24, 24, 24, 0),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: [
              AppColors.primary.withOpacity(0.15),
              AppColors.primaryDark.withOpacity(0.08),
            ],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.primary.withOpacity(0.2)),
        ),
        child: Row(
          children: [
            Text('💡', style: const TextStyle(fontSize: 28)),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Daily Tip',
                      style: GoogleFonts.poppins(
                          fontWeight: FontWeight.w700,
                          color: AppColors.primary,
                          fontSize: 13)),
                  const SizedBox(height: 4),
                  Text(
                    'Koshari (كشري) is rich in plant protein from lentils. A medium plate covers ~30% of your daily protein needs!',
                    style: GoogleFonts.poppins(
                        fontSize: 12,
                        color: AppColors.textSecondary,
                        height: 1.5),
                  ),
                ],
              ),
            ),
          ],
        ),
      ).animate().fadeIn(delay: 1200.ms),
    );
  }
}

class _RingLegend extends StatelessWidget {
  const _RingLegend({required this.color, required this.label});
  final Color color;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(width: 12, height: 12, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
        const SizedBox(width: 6),
        Text(label, style: GoogleFonts.poppins(fontSize: 12, color: AppColors.textMuted)),
      ],
    );
  }
}

class _MacroProgressCard extends StatelessWidget {
  const _MacroProgressCard({
    required this.label,
    required this.target,
    required this.consumed,
    required this.color,
    required this.unit,
    this.horizontal = false,
  });
  final String label;
  final double target;
  final double consumed;
  final Color color;
  final String unit;
  final bool horizontal;

  @override
  Widget build(BuildContext context) {
    final progress = (consumed / target).clamp(0.0, 1.0);
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 8,
                height: 8,
                decoration: BoxDecoration(color: color, shape: BoxShape.circle),
              ),
              const SizedBox(width: 6),
              Text(label,
                  style: GoogleFonts.poppins(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: AppColors.textSecondary)),
              if (horizontal) const Spacer(),
              if (horizontal)
                Text('${consumed.toInt()} / ${target.toInt()}$unit',
                    style: GoogleFonts.poppins(fontSize: 12, color: AppColors.textMuted)),
            ],
          ),
          const SizedBox(height: 8),
          if (!horizontal) ...[
            Text('${consumed.toInt()}$unit',
                style: GoogleFonts.poppins(
                    fontSize: 20,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textPrimary)),
            Text('of ${target.toInt()}$unit',
                style: GoogleFonts.poppins(fontSize: 11, color: AppColors.textMuted)),
            const SizedBox(height: 8),
          ],
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: progress,
              backgroundColor: AppColors.surfaceVariant,
              valueColor: AlwaysStoppedAnimation<Color>(color),
              minHeight: 6,
            ),
          ),
        ],
      ),
    );
  }
}

class _ActionCard extends StatelessWidget {
  const _ActionCard({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.color,
    required this.onTap,
  });
  final IconData icon;
  final String title;
  final String subtitle;
  final Color color;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.border),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: color.withOpacity(0.15),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(icon, color: color, size: 22),
            ),
            const SizedBox(height: 12),
            Text(title,
                style: GoogleFonts.poppins(
                    fontWeight: FontWeight.w600,
                    color: AppColors.textPrimary,
                    fontSize: 13)),
            Text(subtitle,
                style: GoogleFonts.poppins(fontSize: 11, color: AppColors.textMuted)),
          ],
        ),
      ),
    );
  }
}

class _ErrorState extends StatelessWidget {
  const _ErrorState({required this.message});
  final String message;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.wifi_off_rounded, color: AppColors.textMuted, size: 64),
            const SizedBox(height: 16),
            Text('Could not load profile',
                style: GoogleFonts.poppins(
                    fontWeight: FontWeight.w600, color: AppColors.textPrimary, fontSize: 18)),
            const SizedBox(height: 8),
            Text(message,
                style: GoogleFonts.poppins(color: AppColors.textMuted, fontSize: 13),
                textAlign: TextAlign.center),
          ],
        ),
      ),
    );
  }
}

class _NoProfileState extends StatelessWidget {
  const _NoProfileState();

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Text('No profile found.',
          style: GoogleFonts.poppins(color: AppColors.textMuted)),
    );
  }
}
