const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create admin user
  const adminHash = await bcrypt.hash('admin123', 12);
  const admin = await prisma.user.upsert({
    where: { phone: '9999999999' },
    update: {},
    create: {
      name: 'Gym Admin',
      phone: '9999999999',
      email: 'admin@gymbuddy.app',
      passwordHash: adminHash,
      role: 'admin',
    },
  });
  console.log('✅ Admin created:', admin.phone);

  // Create sample member
  const memberHash = await bcrypt.hash('member123', 12);
  const member = await prisma.user.upsert({
    where: { phone: '9876543210' },
    update: {},
    create: {
      name: 'Rahul Sharma',
      phone: '9876543210',
      email: 'rahul@example.com',
      passwordHash: memberHash,
      role: 'member',
      age: 27,
      weight: 72.5,
      height: 175,
      goal: 'Build muscle and improve endurance',
    },
  });
  console.log('✅ Member created:', member.phone);

  // Create exercises
  const exercises = await Promise.all([
    prisma.exercise.upsert({
      where: { id: 'ex-push-up' },
      update: {},
      create: {
        id: 'ex-push-up',
        title: 'Push Up',
        description: 'Classic upper body exercise targeting chest, shoulders, and triceps. Keep your body straight and lower until chest nearly touches the floor.',
        category: 'Chest',
        focusArea: 'Strength',
        level: 'beginner',
        videoUrl: 'https://www.youtube.com/embed/IODxDxX7oi4',
        isPublic: true,
      },
    }),
    prisma.exercise.upsert({
      where: { id: 'ex-squat' },
      update: {},
      create: {
        id: 'ex-squat',
        title: 'Barbell Squat',
        description: 'King of all exercises. Targets quads, hamstrings, glutes, and core. Keep chest up and knees tracking over toes.',
        category: 'Legs',
        focusArea: 'Strength',
        level: 'intermediate',
        videoUrl: 'https://www.youtube.com/embed/SW_C1A-rejs',
        isPublic: true,
      },
    }),
    prisma.exercise.upsert({
      where: { id: 'ex-deadlift' },
      update: {},
      create: {
        id: 'ex-deadlift',
        title: 'Deadlift',
        description: 'Full body compound movement. Engages back, glutes, hamstrings, and core. Maintain neutral spine throughout the lift.',
        category: 'Back',
        focusArea: 'Strength',
        level: 'advanced',
        videoUrl: 'https://www.youtube.com/embed/op9kVnSso6Q',
        isPublic: true,
      },
    }),
    prisma.exercise.upsert({
      where: { id: 'ex-plank' },
      update: {},
      create: {
        id: 'ex-plank',
        title: 'Plank',
        description: 'Isometric core exercise. Hold a push-up position with body in a straight line. Breathe steadily and engage your core.',
        category: 'Core',
        focusArea: 'Endurance',
        level: 'beginner',
        videoUrl: 'https://www.youtube.com/embed/ASdvN_XEl_c',
        isPublic: true,
      },
    }),
    prisma.exercise.upsert({
      where: { id: 'ex-pull-up' },
      update: {},
      create: {
        id: 'ex-pull-up',
        title: 'Pull Up',
        description: 'Upper body pulling exercise targeting the lats and biceps. Dead hang at the bottom, chin over the bar at top.',
        category: 'Back',
        focusArea: 'Strength',
        level: 'intermediate',
        videoUrl: 'https://www.youtube.com/embed/eGo4IYlbE5g',
        isPublic: true,
      },
    }),
    prisma.exercise.upsert({
      where: { id: 'ex-burpee' },
      update: {},
      create: {
        id: 'ex-burpee',
        title: 'Burpee',
        description: 'Full body cardio exercise combining a squat, push-up, and jump. Great for conditioning and burning calories.',
        category: 'Cardio',
        focusArea: 'Endurance',
        level: 'intermediate',
        videoUrl: 'https://www.youtube.com/embed/818DFhfD9hc',
        isPublic: true,
      },
    }),
  ]);
  console.log(`✅ ${exercises.length} exercises created`);

  // Assign exercises to member
  await prisma.memberExercise.createMany({
    data: [
      { memberId: member.id, exerciseId: 'ex-push-up', notes: '3 sets of 15 reps' },
      { memberId: member.id, exerciseId: 'ex-squat', notes: '4 sets of 10 reps' },
      { memberId: member.id, exerciseId: 'ex-plank', notes: 'Hold for 60 seconds x 3' },
    ],
    skipDuplicates: true,
  });
  console.log('✅ Exercises assigned to member');

  // Create diet plan for member
  await prisma.dietPlan.create({
    data: {
      memberId: member.id,
      title: 'Muscle Building Plan - Week 1',
      content: JSON.stringify({
        meals: [
          {
            name: 'Breakfast (7:00 AM)',
            items: ['4 boiled eggs', 'Oats with milk (200ml)', 'Banana x1', 'Multivitamin'],
            calories: 650,
          },
          {
            name: 'Mid Morning (10:30 AM)',
            items: ['Handful of mixed nuts', 'Greek yogurt (150g)'],
            calories: 280,
          },
          {
            name: 'Lunch (1:00 PM)',
            items: ['Rice (200g cooked)', 'Chicken breast (150g)', 'Mixed vegetables', 'Dal'],
            calories: 750,
          },
          {
            name: 'Pre-Workout (4:00 PM)',
            items: ['Banana x1', 'Peanut butter toast x2', 'Black coffee (optional)'],
            calories: 350,
          },
          {
            name: 'Post-Workout (7:00 PM)',
            items: ['Whey protein shake (30g)', 'Banana x1'],
            calories: 220,
          },
          {
            name: 'Dinner (8:30 PM)',
            items: ['Chapati x3', 'Paneer or Chicken curry', 'Salad', 'Milk (200ml)'],
            calories: 700,
          },
        ],
        totalCalories: 2950,
        protein: '180g',
        carbs: '320g',
        fats: '75g',
      }),
      notes: 'Drink 3-4 litres of water daily. Avoid junk food and sugary drinks.',
    },
  });
  console.log('✅ Diet plan created');

  // Create gallery items
  await prisma.galleryItem.createMany({
    data: [
      {
        title: 'Protein Smoothie Bowl',
        description: 'High protein breakfast bowl with banana, whey protein, oats, and mixed berries. Perfect post-workout meal.',
        type: 'recipe',
        imageUrl: 'https://images.unsplash.com/photo-1511690656952-34342bb7c2f2?w=600',
        tags: ['protein', 'breakfast', 'healthy'],
      },
      {
        title: 'Grilled Chicken Salad',
        description: 'Lean protein packed salad with grilled chicken breast, mixed greens, cherry tomatoes, and olive oil dressing.',
        type: 'recipe',
        imageUrl: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600',
        tags: ['protein', 'lunch', 'low-carb'],
      },
      {
        title: 'Beginner Workout Routine',
        description: 'Full body workout for beginners. 3 days per week. Focus on compound movements and proper form.',
        type: 'exercise',
        imageUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600',
        videoUrl: 'https://www.youtube.com/embed/vc1E5CfRfos',
        tags: ['beginner', 'fullbody', 'workout'],
      },
      {
        title: 'Masala Oats',
        description: 'Savory oats recipe with vegetables, spices, and topped with a boiled egg. Great for a filling breakfast.',
        type: 'recipe',
        imageUrl: 'https://images.unsplash.com/photo-1495214783159-3503fd1b572d?w=600',
        tags: ['breakfast', 'vegetarian', 'quick'],
      },
    ],
    skipDuplicates: false,
  });
  console.log('✅ Gallery items created');

  console.log('\n🎉 Seed complete!');
  console.log('Admin login: phone=9999999999, password=admin123');
  console.log('Member login: phone=9876543210, password=member123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
