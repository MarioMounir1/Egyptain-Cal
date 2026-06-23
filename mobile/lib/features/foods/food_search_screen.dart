import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:go_router/go_router.dart';
import 'package:egyptian_cal/core/theme/app_theme.dart';
import 'package:egyptian_cal/core/providers/providers.dart';
import 'package:egyptian_cal/core/models/models.dart';

class FoodSearchScreen extends ConsumerStatefulWidget {
  const FoodSearchScreen({super.key});

  @override
  ConsumerState<FoodSearchScreen> createState() => _FoodSearchScreenState();
}

class _FoodSearchScreenState extends ConsumerState<FoodSearchScreen> {
  final _searchCtrl = TextEditingController();
  FoodRecord? _selectedFood;

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final results = ref.watch(foodSearchResultsProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Food Database'),
        actions: [
          IconButton(
            onPressed: () => context.go('/foods/add'),
            icon: const Icon(Icons.add_rounded),
            tooltip: 'Add food',
          ),
        ],
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(24, 8, 24, 0),
            child: TextField(
              controller: _searchCtrl,
              autofocus: false,
              decoration: InputDecoration(
                hintText: 'Search in Arabic or English... كشري، فول',
                prefixIcon: const Icon(Icons.search_rounded),
                suffixIcon: _searchCtrl.text.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear_rounded),
                        onPressed: () {
                          _searchCtrl.clear();
                          ref.read(foodSearchQueryProvider.notifier).state = '';
                        },
                      )
                    : null,
              ),
              onChanged: (v) {
                setState(() {});
                ref.read(foodSearchQueryProvider.notifier).state = v;
              },
            ),
          ),
          const SizedBox(height: 8),
          Expanded(
            child: results.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (e, _) => _EmptyState(
                icon: Icons.wifi_off_rounded,
                message: 'Could not connect to server',
                subtitle: e.toString(),
              ),
              data: (foods) {
                if (_searchCtrl.text.isEmpty) {
                  return _EmptyStatePlaceholder();
                }
                if (foods.isEmpty) {
                  return _EmptyState(
                    icon: Icons.search_off_rounded,
                    message: 'No results found',
                    subtitle: 'Try adding this food manually',
                    actionLabel: 'Add Food',
                    onAction: () => context.go('/foods/add'),
                  );
                }
                return ListView.builder(
                  padding: const EdgeInsets.fromLTRB(24, 12, 24, 24),
                  itemCount: foods.length,
                  itemBuilder: (ctx, i) => Padding(
                    padding: const EdgeInsets.only(bottom: 10),
                    child: _FoodCard(
                      food: foods[i],
                      onTap: () => _showFoodDetail(context, foods[i]),
                    ).animate().fadeIn(delay: (i * 50).ms).slideY(begin: 0.1),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  void _showFoodDetail(BuildContext context, FoodRecord food) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (_) => _FoodDetailSheet(food: food),
    );
  }
}

class _FoodCard extends StatelessWidget {
  const _FoodCard({required this.food, required this.onTap});
  final FoodRecord food;
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
        child: Row(
          children: [
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                color: AppColors.primary.withOpacity(0.12),
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Icon(Icons.restaurant_rounded, color: AppColors.primary, size: 24),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          food.name,
                          style: GoogleFonts.cairo(
                            fontWeight: FontWeight.w700,
                            color: AppColors.textPrimary,
                            fontSize: 15,
                          ),
                        ),
                      ),
                      if (food.verified)
                        const Icon(Icons.verified_rounded,
                            color: AppColors.secondary, size: 16),
                    ],
                  ),
                  if (food.nameEn != null)
                    Text(
                      food.nameEn!,
                      style: GoogleFonts.poppins(
                          fontSize: 12, color: AppColors.textMuted),
                    ),
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      _MacroBadge(
                          label: '${food.caloriesMid.toInt()} kcal',
                          color: AppColors.calories),
                      const SizedBox(width: 6),
                      _MacroBadge(
                          label: 'P ${food.proteinMid.toStringAsFixed(1)}g',
                          color: AppColors.protein),
                      const SizedBox(width: 6),
                      _MacroBadge(
                          label: 'C ${food.carbsMid.toStringAsFixed(1)}g',
                          color: AppColors.carbs),
                    ],
                  ),
                ],
              ),
            ),
            const Icon(Icons.chevron_right_rounded, color: AppColors.textMuted),
          ],
        ),
      ),
    );
  }
}

class _MacroBadge extends StatelessWidget {
  const _MacroBadge({required this.label, required this.color});
  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: color.withOpacity(0.12),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(label,
          style: GoogleFonts.poppins(
              fontSize: 10,
              fontWeight: FontWeight.w600,
              color: color)),
    );
  }
}

class _FoodDetailSheet extends StatelessWidget {
  const _FoodDetailSheet({required this.food});
  final FoodRecord food;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 40,
            height: 4,
            margin: const EdgeInsets.only(bottom: 24),
            decoration: BoxDecoration(
              color: AppColors.border,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      food.name,
                      style: GoogleFonts.cairo(
                          fontSize: 24,
                          fontWeight: FontWeight.w800,
                          color: AppColors.textPrimary),
                    ),
                    if (food.nameEn != null)
                      Text(food.nameEn!,
                          style: GoogleFonts.poppins(
                              fontSize: 14, color: AppColors.textMuted)),
                  ],
                ),
              ),
              _SourceBadge(source: food.source, verified: food.verified),
            ],
          ),
          if (food.servingDesc != null) ...[
            const SizedBox(height: 8),
            Row(
              children: [
                const Icon(Icons.restaurant_menu_outlined,
                    size: 14, color: AppColors.textMuted),
                const SizedBox(width: 6),
                Text(
                  'Serving: ${food.servingDesc}',
                  style: GoogleFonts.poppins(
                      fontSize: 13, color: AppColors.textMuted),
                ),
              ],
            ),
          ],
          const SizedBox(height: 24),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppColors.calories.withOpacity(0.1),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: AppColors.calories.withOpacity(0.2)),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('Calories',
                    style: GoogleFonts.poppins(
                        fontWeight: FontWeight.w600,
                        color: AppColors.calories,
                        fontSize: 14)),
                Text(
                  '${food.caloriesMin.toInt()} – ${food.caloriesMax.toInt()} kcal',
                  style: GoogleFonts.poppins(
                      fontWeight: FontWeight.w700,
                      color: AppColors.calories,
                      fontSize: 16),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: _MacroRangeCard(
                  label: 'Protein',
                  min: food.proteinMinG,
                  max: food.proteinMaxG,
                  color: AppColors.protein,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _MacroRangeCard(
                  label: 'Carbs',
                  min: food.carbsMinG,
                  max: food.carbsMaxG,
                  color: AppColors.carbs,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _MacroRangeCard(
                  label: 'Fat',
                  min: food.fatMinG,
                  max: food.fatMaxG,
                  color: AppColors.fat,
                ),
              ),
            ],
          ),
          if (food.category != null) ...[
            const SizedBox(height: 16),
            Align(
              alignment: Alignment.centerLeft,
              child: Chip(
                label: Text(food.category!),
                avatar: const Icon(Icons.category_outlined, size: 16),
              ),
            ),
          ],
          const SizedBox(height: 24),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: () => Navigator.pop(context),
              icon: const Icon(Icons.close_rounded),
              label: const Text('Close'),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.surfaceVariant,
                foregroundColor: AppColors.textPrimary,
              ),
            ),
          ),
          const SizedBox(height: 8),
        ],
      ),
    );
  }
}

class _MacroRangeCard extends StatelessWidget {
  const _MacroRangeCard({
    required this.label,
    required this.min,
    required this.max,
    required this.color,
  });
  final String label;
  final double min;
  final double max;
  final Color color;

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
          Text(label,
              style: GoogleFonts.poppins(
                  fontSize: 11, color: AppColors.textMuted)),
          const SizedBox(height: 4),
          Text('${min.toStringAsFixed(1)}g',
              style: GoogleFonts.poppins(
                  fontWeight: FontWeight.w600,
                  fontSize: 14,
                  color: color)),
          Text('– ${max.toStringAsFixed(1)}g',
              style: GoogleFonts.poppins(fontSize: 11, color: color.withOpacity(0.7))),
        ],
      ),
    );
  }
}

class _SourceBadge extends StatelessWidget {
  const _SourceBadge({required this.source, required this.verified});
  final String source;
  final bool verified;

  @override
  Widget build(BuildContext context) {
    Color color;
    String label;
    IconData icon;

    if (verified) {
      color = AppColors.secondary;
      label = 'Verified';
      icon = Icons.verified_rounded;
    } else {
      switch (source) {
        case 'ai':
          color = AppColors.primary;
          label = 'AI';
          icon = Icons.auto_awesome_rounded;
        case 'photo':
          color = AppColors.protein;
          label = 'Photo';
          icon = Icons.camera_alt_rounded;
        default:
          color = AppColors.textMuted;
          label = 'Manual';
          icon = Icons.edit_rounded;
      }
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: color.withOpacity(0.12),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 12, color: color),
          const SizedBox(width: 4),
          Text(label,
              style: GoogleFonts.poppins(
                  fontSize: 11, fontWeight: FontWeight.w600, color: color)),
        ],
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  const _EmptyState({
    required this.icon,
    required this.message,
    this.subtitle,
    this.actionLabel,
    this.onAction,
  });
  final IconData icon;
  final String message;
  final String? subtitle;
  final String? actionLabel;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, color: AppColors.textMuted, size: 64),
            const SizedBox(height: 16),
            Text(message,
                style: GoogleFonts.poppins(
                    fontWeight: FontWeight.w600,
                    color: AppColors.textPrimary,
                    fontSize: 16),
                textAlign: TextAlign.center),
            if (subtitle != null) ...[
              const SizedBox(height: 8),
              Text(subtitle!,
                  style: GoogleFonts.poppins(
                      color: AppColors.textMuted, fontSize: 13),
                  textAlign: TextAlign.center),
            ],
            if (actionLabel != null) ...[
              const SizedBox(height: 20),
              OutlinedButton(
                onPressed: onAction,
                child: Text(actionLabel!),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _EmptyStatePlaceholder extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text('🍽️', style: const TextStyle(fontSize: 56)),
          const SizedBox(height: 16),
          Text('Search Egyptian foods',
              style: GoogleFonts.poppins(
                  fontWeight: FontWeight.w600,
                  color: AppColors.textPrimary,
                  fontSize: 18)),
          const SizedBox(height: 8),
          Text('كشري • فول مدمس • طعمية • شاورما',
              style: GoogleFonts.cairo(
                  color: AppColors.textMuted, fontSize: 14)),
        ],
      ),
    );
  }
}
