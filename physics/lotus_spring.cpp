// A small C++ reference for the "physics feeling" used in src/app.js.
//
// The browser app is JavaScript because MediaPipe Tasks Vision runs nicely there,
// but the same smoothing idea can be written like a tiny spring simulation in C++.
// You could port this style into TouchDesigner C++ TOP/CHOP code, OpenFrameworks,
// or any realtime graphics loop.

#include <cmath>

struct Vec2 {
  float x = 0.0f;
  float y = 0.0f;
};

struct LotusState {
  Vec2 position;
  Vec2 velocity;
  float bloom = 0.0f;
};

static float clamp01(float value) {
  if (value < 0.0f) return 0.0f;
  if (value > 1.0f) return 1.0f;
  return value;
}

static Vec2 operator+(Vec2 a, Vec2 b) {
  return {a.x + b.x, a.y + b.y};
}

static Vec2 operator-(Vec2 a, Vec2 b) {
  return {a.x - b.x, a.y - b.y};
}

static Vec2 operator*(Vec2 value, float scale) {
  return {value.x * scale, value.y * scale};
}

// Call once per frame. targetPalm comes from hand tracking, handVisible is true
// when MediaPipe sees a hand, and dt is seconds since the previous frame.
void updateLotusPhysics(LotusState& lotus, Vec2 targetPalm, bool handVisible, float dt) {
  const float stiffness = 72.0f;
  const float damping = 15.0f;

  Vec2 displacement = targetPalm - lotus.position;
  Vec2 acceleration = displacement * stiffness - lotus.velocity * damping;

  lotus.velocity = lotus.velocity + acceleration * dt;
  lotus.position = lotus.position + lotus.velocity * dt;

  const float targetBloom = handVisible ? 1.0f : 0.0f;
  const float bloomSpeed = handVisible ? 7.0f : 2.5f;
  lotus.bloom += (targetBloom - lotus.bloom) * clamp01(dt * bloomSpeed);
}

// Example petal scale: combine hand openness, pinch, and the spring bloom amount.
float petalRadius(float handOpenness, float pinchAmount, float bloom) {
  const float openness = 0.25f + clamp01(handOpenness) * 1.1f;
  const float pinchBoost = clamp01(pinchAmount) * 55.0f;
  return (70.0f + openness * 115.0f + pinchBoost) * clamp01(bloom);
}
