const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create super admin user
  const superAdminHash = await bcrypt.hash('super123', 12);
  const superAdmin = await prisma.user.upsert({
    where: { phone: '1111111111' },
    update: {},
    create: {
      name: 'Super Admin',
      phone: '1111111111',
      email: 'superadmin@gymbuddy.app',
      passwordHash: superAdminHash,
      role: 'super_admin',
    },
  });
  console.log('✅ Super Admin created:', superAdmin.phone);

  // Create sample gyms
  const gym1 = await prisma.gym.upsert({
    where: { id: 'gym-downtown' },
    update: {},
    create: {
      id: 'gym-downtown',
      name: 'FitZone Downtown',
      description: 'Premium fitness facility with modern equipment and personal training services',
      address: '123 Main Street, Downtown, City 10001',
      phone: '+1-555-0101',
      email: 'downtown@fitzone.com',
      maxMembers: 150,
      logoUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=200',
    },
  });
  console.log('✅ Gym created:', gym1.name);

  const gym2 = await prisma.gym.upsert({
    where: { id: 'gym-uptown' },
    update: {},
    create: {
      id: 'gym-uptown',
      name: 'PowerHouse Uptown',
      description: 'Hardcore gym focused on strength training and bodybuilding',
      address: '456 Oak Avenue, Uptown, City 10002',
      phone: '+1-555-0102',
      email: 'uptown@powerhouse.com',
      maxMembers: 100,
      logoUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=200',
    },
  });
  console.log('✅ Gym created:', gym2.name);

  // Create admin users for each gym
  const admin1Hash = await bcrypt.hash('admin123', 12);
  const admin1 = await prisma.user.upsert({
    where: { phone: '9999999999' },
    update: { gymId: gym1.id },
    create: {
      name: 'John Smith',
      phone: '9999999999',
      email: 'john.smith@fitzone.com',
      passwordHash: admin1Hash,
      role: 'admin',
      gymId: gym1.id,
    },
  });
  console.log('✅ Admin created for', gym1.name, ':', admin1.phone);

  const admin2Hash = await bcrypt.hash('admin456', 12);
  const admin2 = await prisma.user.upsert({
    where: { phone: '8888888888' },
    update: { gymId: gym2.id },
    create: {
      name: 'Sarah Johnson',
      phone: '8888888888',
      email: 'sarah.johnson@powerhouse.com',
      passwordHash: admin2Hash,
      role: 'admin',
      gymId: gym2.id,
    },
  });
  console.log('✅ Admin created for', gym2.name, ':', admin2.phone);

  // Create sample members for each gym
  const member1Hash = await bcrypt.hash('member123', 12);
  const member1 = await prisma.user.upsert({
    where: { phone: '9876543210' },
    update: { gymId: gym1.id },
    create: {
      name: 'Rahul Sharma',
      phone: '9876543210',
      email: 'rahul@example.com',
      passwordHash: member1Hash,
      role: 'member',
      gymId: gym1.id,
      age: 27,
      weight: 72.5,
      height: 175,
      goal: 'Build muscle and improve endurance',
    },
  });
  console.log('✅ Member created for', gym1.name, ':', member1.phone);

  const member2Hash = await bcrypt.hash('member456', 12);
  const member2 = await prisma.user.upsert({
    where: { phone: '7777777777' },
    update: { gymId: gym2.id },
    create: {
      name: 'Mike Wilson',
      phone: '7777777777',
      email: 'mike.wilson@example.com',
      passwordHash: member2Hash,
      role: 'member',
      gymId: gym2.id,
      age: 32,
      weight: 85.0,
      height: 180,
      goal: 'Strength training and competition prep',
    },
  });
  console.log('✅ Member created for', gym2.name, ':', member2.phone);

  // Create exercises - use createMany to avoid upsert conflicts
  const exercisesData = [
    {
      id: 'ex-push-up',
      title: 'Push Up',
      description: 'Classic upper body exercise targeting chest, shoulders, and triceps. Keep your body straight and lower until chest nearly touches the floor.',
      category: 'Chest',
      focusArea: 'Strength',
      level: 'beginner',
      videoUrl: 'https://www.youtube.com/embed/IODxDxX7oi4',
      isPublic: true,
    },
    {
      id: 'ex-squat',
      title: 'Barbell Squat',
      description: 'King of all exercises. Targets quads, hamstrings, glutes, and core. Keep chest up and knees tracking over toes.',
      category: 'Legs',
      focusArea: 'Strength',
      level: 'intermediate',
      videoUrl: 'https://www.youtube.com/embed/SW_C1A-rejs',
      isPublic: true,
    },
    {
      id: 'ex-deadlift',
      title: 'Deadlift',
      description: 'Full body compound movement. Engages back, glutes, hamstrings, and core. Maintain neutral spine throughout the lift.',
      category: 'Back',
      focusArea: 'Strength',
      level: 'advanced',
      videoUrl: 'https://www.youtube.com/embed/op9kVnSso6Q',
      isPublic: true,
    },
    {
      id: 'ex-plank',
      title: 'Plank',
      description: 'Isometric core exercise. Hold a push-up position with body in a straight line. Breathe steadily and engage your core.',
      category: 'Core',
      focusArea: 'Endurance',
      level: 'beginner',
      videoUrl: 'https://www.youtube.com/embed/ASdvN_XEl_c',
      isPublic: true,
    },
    {
      id: 'ex-pull-up',
      title: 'Pull Up',
      description: 'Upper body pulling exercise targeting the lats and biceps. Dead hang at the bottom, chin over the bar at top.',
      category: 'Back',
      focusArea: 'Strength',
      level: 'intermediate',
      videoUrl: 'https://www.youtube.com/embed/eGo4IYlbE5g',
      isPublic: true,
    },
    {
      id: 'ex-burpee',
      title: 'Burpee',
      description: 'Full body cardio exercise combining a squat, push-up, and jump. Great for conditioning and burning calories.',
      category: 'Cardio',
      focusArea: 'Endurance',
      level: 'intermediate',
      videoUrl: 'https://www.youtube.com/embed/818DFhfD9hc',
      isPublic: true,
    },
  ];

  await prisma.exercise.createMany({
    data: exercisesData,
    skipDuplicates: true,
  });

  const exercises = await prisma.exercise.findMany({
    where: { id: { in: exercisesData.map(e => e.id) } }
  });
  console.log(`✅ ${exercises.length} exercises created`);

  // Assign exercises to members
  await prisma.memberExercise.createMany({
    data: [
      // Exercises for member1 (Rahul Sharma)
      { memberId: member1.id, exerciseId: 'ex-push-up', notes: '3 sets of 15 reps' },
      { memberId: member1.id, exerciseId: 'ex-squat', notes: '4 sets of 10 reps' },
      { memberId: member1.id, exerciseId: 'ex-plank', notes: 'Hold for 60 seconds x 3' },
      // Exercises for member2 (Mike Wilson)
      { memberId: member2.id, exerciseId: 'ex-deadlift', notes: '5 sets of 5 reps' },
      { memberId: member2.id, exerciseId: 'ex-pull-up', notes: '4 sets of 8 reps' },
      { memberId: member2.id, exerciseId: 'ex-burpee', notes: '3 sets of 12 reps' },
    ],
    skipDuplicates: true,
  });
  console.log('✅ Exercises assigned to members');

  // Create diet plan for member1
  await prisma.dietPlan.create({
    data: {
      memberId: member1.id,
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
  console.log('✅ Diet plan created for member1');

  // Create diet plan for member2
  await prisma.dietPlan.create({
    data: {
      memberId: member2.id,
      title: 'Strength Training Plan - Week 1',
      content: JSON.stringify({
        meals: [
          {
            name: 'Breakfast (6:30 AM)',
            items: ['6 egg whites', 'Whole wheat toast x2', 'Peanut butter', 'Black coffee'],
            calories: 450,
          },
          {
            name: 'Mid Morning (9:30 AM)',
            items: ['Protein shake (40g)', 'Almonds (30g)', 'Apple x1'],
            calories: 320,
          },
          {
            name: 'Lunch (12:30 PM)',
            items: ['Grilled chicken breast (200g)', 'Brown rice (150g)', 'Broccoli', 'Olive oil'],
            calories: 580,
          },
          {
            name: 'Pre-Workout (3:30 PM)',
            items: ['Banana x2', 'Greek yogurt (200g)', 'Honey'],
            calories: 280,
          },
          {
            name: 'Post-Workout (6:00 PM)',
            items: ['Whey protein shake (40g)', 'Creatine (5g)', 'Water'],
            calories: 200,
          },
          {
            name: 'Dinner (7:30 PM)',
            items: ['Salmon fillet (250g)', 'Sweet potato (200g)', 'Mixed vegetables', 'Avocado'],
            calories: 650,
          },
        ],
        totalCalories: 2480,
        protein: '220g',
        carbs: '180g',
        fats: '85g',
      }),
      notes: 'Focus on high protein intake. Drink plenty of water. Get 8 hours of sleep.',
    },
  });
  console.log('✅ Diet plan created for member2');

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
  console.log('Super Admin login: phone=1111111111, password=super123');
  console.log('FitZone Admin login: phone=9999999999, password=admin123');
  console.log('PowerHouse Admin login: phone=8888888888, password=admin456');
  console.log('FitZone Member login: phone=9876543210, password=member123');
  console.log('PowerHouse Member login: phone=7777777777, password=member456');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
