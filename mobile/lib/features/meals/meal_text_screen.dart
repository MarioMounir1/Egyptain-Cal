import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:go_router/go_router.dart';
import 'package:egyptian_cal/core/theme/app_theme.dart';
import 'package:egyptian_cal/core/providers/providers.dart';
import 'package:egyptian_cal/core/models/models.dart';
import 'package:egyptian_cal/features/meals/meal_result_card.dart';

class MealTextScreen extends ConsumerStatefulWidget {
  const MealTextScreen({super.key});

  @override
  ConsumerState<MealTextScreen> createState() => _MealTextScreenState();
}

class _MealTextScreenState extends ConsumerState<MealTextScreen> {
  final _textCtrl = TextEditingController();
  bool _isAnalyzing = false;
  MealResult? _result;
  String? _error;

  @override
  void dispose() {
    _textCtrl.dispose();
    super.dispose();
  }

  Future<void> _analyze() async {
    final text = _textCtrl.text.trim();
    if (text.length < 3) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please describe your meal (min 3 characters)')),
      );
      return;
    }
    final userId = ref.read(userIdProvider);
    if (userId == null) return;

    setState(() {
      _isAnalyzing = true;
      _result = null;
      _error = null;
    });

    try {
      final result = await ref.read(apiServiceProvider).analyzeMealText(
            rawText: text,
            userId: userId,
          );
      if (mounted) setState(() => _result = result);
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _isAnalyzing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Analyze Meal'),
        actions: [
          IconButton(
            onPressed: () => context.go('/meals/photo'),
            icon: const Icon(Icons.camera_alt_rounded),
            tooltip: 'Switch to photo',
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(24),
        children: [
          _buildHeader(),
          const SizedBox(height: 24),
          _buildInputCard(),
          const SizedBox(height: 16),
          _buildSuggestions(),
          const SizedBox(height: 24),
          if (_isAnalyzing) _buildLoading(),
          if (_error != null) _buildError(),
          if (_result != null)
            MealResultCard(result: _result!)
                .animate()
                .fadeIn()
                .slideY(begin: 0.2),
        ],
      ),
    );
  }

  Widget _buildHeader() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: 56,
          height: 56,
          decoration: BoxDecoration(
            color: AppColors.secondary.withOpacity(0.12),
            borderRadius: BorderRadius.circular(16),
          ),
          child: const Icon(Icons.chat_bubble_outline_rounded,
              color: AppColors.secondary, size: 28),
        ).animate().fadeIn().scale(begin: const Offset(0.8, 0.8)),
        const SizedBox(height: 16),
        Text('AI Meal Analysis',
            style: GoogleFonts.poppins(
                fontSize: 22,
                fontWeight: FontWeight.w700,
                color: AppColors.textPrimary)),
        const SizedBox(height: 4),
        Text(
          'Describe your meal in Arabic or English. Our AI will estimate the nutritional content.',
          style: GoogleFonts.poppins(fontSize: 13, color: AppColors.textMuted, height: 1.5),
        ),
      ],
    ).animate().fadeIn(delay: 100.ms);
  }

  Widget _buildInputCard() {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        children: [
          TextField(
            controller: _textCtrl,
            maxLines: 5,
            minLines: 4,
            textDirection: TextDirection.rtl,
            decoration: InputDecoration(
              hintText: 'e.g. طبق كشري كبير مع صوص حار\nor: Large koshari plate with spicy sauce',
              hintStyle: GoogleFonts.cairo(color: AppColors.textMuted, fontSize: 14),
              border: InputBorder.none,
              contentPadding: const EdgeInsets.all(16),
            ),
          ),
          const Divider(height: 1),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 10, 16, 10),
            child: Row(
              children: [
                Text(
                  'Max 500 characters',
                  style: GoogleFonts.poppins(fontSize: 11, color: AppColors.textMuted),
                ),
                const Spacer(),
                ElevatedButton.icon(
                  onPressed: _isAnalyzing ? null : _analyze,
                  icon: _isAnalyzing
                      ? const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(
                              strokeWidth: 2,
                              valueColor: AlwaysStoppedAnimation(Colors.white)),
                        )
                      : const Icon(Icons.auto_awesome_rounded, size: 18),
                  label: const Text('Analyze'),
                  style: ElevatedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    ).animate().fadeIn(delay: 200.ms);
  }

  Widget _buildSuggestions() {
    final suggestions = [
      'طبق كشري كبير',
      'شاورما دجاج',
      'فول مدمس بزيت',
      'طعمية 3 حبات',
      'بيتزا مارجريتا',
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Try these',
            style: GoogleFonts.poppins(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: AppColors.textMuted)),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: suggestions
              .map((s) => GestureDetector(
                    onTap: () {
                      _textCtrl.text = s;
                      setState(() {});
                    },
                    child: Container(
                      padding:
                          const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: AppColors.surfaceVariant,
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: AppColors.border),
                      ),
                      child: Text(s,
                          style: GoogleFonts.cairo(
                              fontSize: 13,
                              color: AppColors.textSecondary)),
                    ),
                  ))
              .toList(),
        ),
      ],
    ).animate().fadeIn(delay: 300.ms);
  }

  Widget _buildLoading() {
    return Container(
      margin: const EdgeInsets.only(bottom: 24),
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        children: [
          const CircularProgressIndicator(),
          const SizedBox(height: 16),
          Text(
            'Analyzing your meal...\nجاري تحليل وجبتك...',
            style: GoogleFonts.poppins(color: AppColors.textMuted, fontSize: 14),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    ).animate().fadeIn();
  }

  Widget _buildError() {
    return Container(
      margin: const EdgeInsets.only(bottom: 24),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.error.withOpacity(0.1),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.error.withOpacity(0.3)),
      ),
      child: Row(
        children: [
          const Icon(Icons.error_outline_rounded, color: AppColors.error, size: 22),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Analysis Failed',
                    style: GoogleFonts.poppins(
                        fontWeight: FontWeight.w600,
                        color: AppColors.error,
                        fontSize: 14)),
                Text(_error!,
                    style: GoogleFonts.poppins(
                        fontSize: 12, color: AppColors.error.withOpacity(0.8))),
              ],
            ),
          ),
        ],
      ),
    ).animate().fadeIn();
  }
}
