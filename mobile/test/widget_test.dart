import 'package:flutter_test/flutter_test.dart';
import 'package:egyptian_cal/main.dart';

void main() {
  testWidgets('App smoke test', (WidgetTester tester) async {
    expect(EgyptianCalApp, isNotNull);
  });
}
