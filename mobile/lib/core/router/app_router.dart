import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:egyptian_cal/core/providers/providers.dart';
import 'package:egyptian_cal/features/onboarding/onboarding_screen.dart';
import 'package:egyptian_cal/features/dashboard/dashboard_screen.dart';
import 'package:egyptian_cal/features/profile/profile_screen.dart';
import 'package:egyptian_cal/features/foods/food_search_screen.dart';
import 'package:egyptian_cal/features/foods/add_food_screen.dart';
import 'package:egyptian_cal/features/meals/meal_text_screen.dart';
import 'package:egyptian_cal/features/meals/meal_photo_screen.dart';
import 'package:egyptian_cal/features/shell/app_shell.dart';

final routerProvider = Provider<GoRouter>((ref) {
  final userId = ref.watch(userIdProvider);

  return GoRouter(
    initialLocation: userId == null ? '/onboarding' : '/dashboard',
    redirect: (context, state) {
      final loggedIn = ref.read(userIdProvider) != null;
      final onOnboarding = state.matchedLocation == '/onboarding';
      if (!loggedIn && !onOnboarding) return '/onboarding';
      if (loggedIn && onOnboarding) return '/dashboard';
      return null;
    },
    routes: [
      GoRoute(
        path: '/onboarding',
        name: 'onboarding',
        builder: (ctx, state) => const OnboardingScreen(),
      ),
      ShellRoute(
        builder: (ctx, state, child) => AppShell(child: child),
        routes: [
          GoRoute(
            path: '/dashboard',
            name: 'dashboard',
            builder: (ctx, state) => const DashboardScreen(),
          ),
          GoRoute(
            path: '/profile',
            name: 'profile',
            builder: (ctx, state) => const ProfileScreen(),
          ),
          GoRoute(
            path: '/foods',
            name: 'foods',
            builder: (ctx, state) => const FoodSearchScreen(),
            routes: [
              GoRoute(
                path: 'add',
                name: 'add-food',
                builder: (ctx, state) => const AddFoodScreen(),
              ),
            ],
          ),
          GoRoute(
            path: '/meals/text',
            name: 'meal-text',
            builder: (ctx, state) => const MealTextScreen(),
          ),
          GoRoute(
            path: '/meals/photo',
            name: 'meal-photo',
            builder: (ctx, state) => const MealPhotoScreen(),
          ),
        ],
      ),
    ],
    errorBuilder: (ctx, state) => Scaffold(
      body: Center(
        child: Text('Page not found: ${state.error}'),
      ),
    ),
  );
});
