import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:egyptian_cal/core/theme/app_theme.dart';
import 'package:egyptian_cal/core/providers/providers.dart';
import 'package:egyptian_cal/core/models/models.dart';
import 'package:egyptian_cal/features/meals/meal_result_card.dart';

class MealPhotoScreen extends ConsumerStatefulWidget {
  const MealPhotoScreen({super.key});

  @override
  ConsumerState<MealPhotoScreen> createState() => _MealPhotoScreenState();
}

class _MealPhotoScreenState extends ConsumerState<MealPhotoScreen> {
  final _picker = ImagePicker();
  File? _image;
  String _mode = 'photo';
  bool _isAnalyzing = false;
  MealResult? _result;
  String? _error;

  Future<void> _pickImage(ImageSource source) async {
    try {
      final picked = await _picker.pickImage(
        source: source,
        maxWidth: 1024,
        maxHeight: 1024,
        imageQuality: 85,
      );
      if (picked == null) return;
      setState(() {
        _image = File(picked.path);
        _result = null;
        _error = null;
      });
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Could not pick image: $e')),
        );
      }
    }
  }

  Future<void> _analyze() async {
    if (_image == null) return;
    final userId = ref.read(userIdProvider);
    if (userId == null) return;

    setState(() {
      _isAnalyzing = true;
      _result = null;
      _error = null;
    });

    try {
      final bytes = await _image!.readAsBytes();
      final base64Image = base64Encode(bytes);

      final result = await ref.read(apiServiceProvider).analyzeMealPhoto(
            base64Image: base64Image,
            userId: userId,
            mode: _mode,
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
        title: const Text('Photo Analysis'),
        actions: [
          IconButton(
            onPressed: () => context.go('/meals/text'),
            icon: const Icon(Icons.chat_bubble_outline_rounded),
            tooltip: 'Switch to text',
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(24),
        children: [
          _buildHeader(),
          const SizedBox(height: 24),
          _buildModeSelector(),
          const SizedBox(height: 20),
          _buildImagePicker(),
          const SizedBox(height: 16),
          if (_image != null) _buildAnalyzeButton(),
          const SizedBox(height: 24),
          if (_isAnalyzing) _buildLoading(),
          if (_error != null) _buildError(),
          if (_result != null)
            MealResultCard(result: _result!)
                .animate()
                .fadeIn()
                .slideY(begin: 0.2),
          const SizedBox(height: 24),
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
            color: AppColors.protein.withOpacity(0.12),
            borderRadius: BorderRadius.circular(16),
          ),
          child: const Icon(Icons.camera_alt_rounded, color: AppColors.protein, size: 28),
        ).animate().fadeIn().scale(begin: const Offset(0.8, 0.8)),
        const SizedBox(height: 16),
        Text('AI Photo Analysis',
            style: GoogleFonts.poppins(
                fontSize: 22,
                fontWeight: FontWeight.w700,
                color: AppColors.textPrimary)),
        const SizedBox(height: 4),
        Text(
          'Take a photo of your meal or upload a nutrition label screenshot. Our LLaVA vision AI will analyze it.',
          style: GoogleFonts.poppins(fontSize: 13, color: AppColors.textMuted, height: 1.5),
        ),
      ],
    ).animate().fadeIn(delay: 100.ms);
  }

  Widget _buildModeSelector() {
    return Row(
      children: [
        Expanded(
          child: _ModeChip(
            label: 'Food Photo',
            icon: Icons.camera_alt_outlined,
            value: 'photo',
            selected: _mode == 'photo',
            onTap: () => setState(() => _mode = 'photo'),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _ModeChip(
            label: 'Nutrition Label',
            icon: Icons.document_scanner_outlined,
            value: 'screenshot',
            selected: _mode == 'screenshot',
            onTap: () => setState(() => _mode = 'screenshot'),
          ),
        ),
      ],
    ).animate().fadeIn(delay: 200.ms);
  }

  Widget _buildImagePicker() {
    if (_image != null) {
      return Stack(
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(20),
            child: Image.file(
              _image!,
              width: double.infinity,
              height: 250,
              fit: BoxFit.cover,
            ),
          ),
          Positioned(
            top: 12,
            right: 12,
            child: GestureDetector(
              onTap: () => setState(() => _image = null),
              child: Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: Colors.black.withOpacity(0.6),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(Icons.close_rounded, color: Colors.white, size: 18),
              ),
            ),
          ),
        ],
      ).animate().fadeIn().scale(begin: const Offset(0.95, 0.95));
    }

    return Row(
      children: [
        Expanded(
          child: _PickerOption(
            icon: Icons.camera_alt_rounded,
            label: 'Camera',
            onTap: () => _pickImage(ImageSource.camera),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _PickerOption(
            icon: Icons.photo_library_rounded,
            label: 'Gallery',
            onTap: () => _pickImage(ImageSource.gallery),
          ),
        ),
      ],
    ).animate().fadeIn(delay: 300.ms);
  }

  Widget _buildAnalyzeButton() {
    return ElevatedButton.icon(
      onPressed: _isAnalyzing ? null : _analyze,
      icon: _isAnalyzing
          ? const SizedBox(
              width: 18,
              height: 18,
              child: CircularProgressIndicator(
                  strokeWidth: 2,
                  valueColor: AlwaysStoppedAnimation(Colors.white)),
            )
          : const Icon(Icons.auto_awesome_rounded),
      label: Text(_isAnalyzing ? 'Analyzing...' : 'Analyze Photo'),
      style: ElevatedButton.styleFrom(
        minimumSize: const Size(double.infinity, 52),
        backgroundColor: AppColors.protein,
      ),
    ).animate().fadeIn();
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
            'LLaVA vision AI is analyzing your image...\nThis may take a moment.',
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

class _ModeChip extends StatelessWidget {
  const _ModeChip({
    required this.label,
    required this.icon,
    required this.value,
    required this.selected,
    required this.onTap,
  });
  final String label;
  final IconData icon;
  final String value;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 14),
        decoration: BoxDecoration(
          color: selected ? AppColors.protein.withOpacity(0.12) : AppColors.surfaceVariant,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: selected ? AppColors.protein : AppColors.border,
            width: selected ? 2 : 1,
          ),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon,
                color: selected ? AppColors.protein : AppColors.textMuted,
                size: 18),
            const SizedBox(width: 8),
            Text(label,
                style: GoogleFonts.poppins(
                    fontSize: 13,
                    fontWeight: selected ? FontWeight.w600 : FontWeight.w400,
                    color: selected ? AppColors.protein : AppColors.textSecondary)),
          ],
        ),
      ),
    );
  }
}

class _PickerOption extends StatelessWidget {
  const _PickerOption({
    required this.icon,
    required this.label,
    required this.onTap,
  });
  final IconData icon;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        height: 140,
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: AppColors.border),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 56,
              height: 56,
              decoration: BoxDecoration(
                color: AppColors.primary.withOpacity(0.12),
                borderRadius: BorderRadius.circular(16),
              ),
              child: Icon(icon, color: AppColors.primary, size: 28),
            ),
            const SizedBox(height: 10),
            Text(label,
                style: GoogleFonts.poppins(
                    fontWeight: FontWeight.w600,
                    color: AppColors.textPrimary,
                    fontSize: 14)),
          ],
        ),
      ),
    );
  }
}
