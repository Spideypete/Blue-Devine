export const DIET_MUTATIONS = {
  carnivore: [
    'accelerated_prey_drive', 'cannibalistic', 'hematophagy', 'hemomania',
    'osteophagic', 'hypermetabolic_inanition', 'augmented_tapetum'
  ],
  herbivore: [
    'barometric_sensitivity', 'photosynthetic_regeneration', 'photosynthetic_tissue',
    'xerocole_adaptation', 'social_behavior', 'truculency', 'wader', 'tactile_endurance'
  ],
  omnivore: [
    'social_behavior'
  ],
  universal: [
    'cellular_regeneration', 'congenital_hypoalgesia', 'efficient_digestion',
    'enlarged_meniscus', 'epidermal_fibrosis', 'featherweight', 'hydrodynamic',
    'hydro_regenerative', 'hypervigilance', 'increased_inspiratory_capacity',
    'infrasound_communication', 'nocturnal', 'osteosclerosis', 'reabsorption',
    'sequential_hermaphroditism', 'submerged_optical_retention', 'sustained_hydration',
    'traumatic_thrombosis', 'gastronomic_regeneration', 'enhanced_digestion',
    'heightened_ghrelin', 'multichambered_lungs', 'parthenogenesis',
    'prolific_reproduction', 'reinforced_tendons', 'reniculate_kidneys'
  ]
};

export const MUTATION_INFO = {
  accelerated_prey_drive: { name: 'Accelerated Prey Drive', diet: 'carnivore', desc: 'Deal more damage to animals below 35% health', value: '10%' },
  cannibalistic: { name: 'Cannibalistic', diet: 'carnivore', desc: 'Add own species as preferred prey', value: null },
  cellular_regeneration: { name: 'Cellular Regeneration', diet: 'universal', desc: 'Recover health slightly faster', value: '15%' },
  congenital_hypoalgesia: { name: 'Congenital Hypoalgesia', diet: 'universal', desc: 'Reduce incoming damage when fighting larger species', value: '15%' },
  efficient_digestion: { name: 'Efficient Digestion', diet: 'universal', desc: 'Food drains more slowly', value: '20%' },
  enlarged_meniscus: { name: 'Enlarged Meniscus', diet: 'universal', desc: 'Fall damage hits stamina before health', value: null },
  epidermal_fibrosis: { name: 'Epidermal Fibrosis', diet: 'universal', desc: 'Increase bleed resistance', value: '15%' },
  featherweight: { name: 'Featherweight', diet: 'universal', desc: 'Footprints fade much faster', value: '50%' },
  hematophagy: { name: 'Hematophagy', diet: 'carnivore', desc: 'Restore some thirst while eating corpses', value: '15%' },
  hemomania: { name: 'Hemomania', diet: 'carnivore', desc: 'Do extra damage on bleeding target', value: '5%' },
  hydrodynamic: { name: 'Hydrodynamic', diet: 'universal', desc: 'Increased swimming speed', value: '15%' },
  hydro_regenerative: { name: 'Hydro-regenerative', diet: 'universal', desc: 'Recover health faster during rainy weather', value: '25%' },
  hypermetabolic_inanition: { name: 'Hypermetabolic Inanition', diet: 'carnivore', desc: 'Less hunger = more damage', value: null },
  hypervigilance: { name: 'Hypervigilance', diet: 'herbivore', desc: 'Increases camera angles when eating/drinking', value: '50%' },
  increased_inspiratory_capacity: { name: 'Increased Inspiratory Capacity', diet: 'universal', desc: 'Increased O2 capacity', value: '15%' },
  infrasound_communication: { name: 'Infrasound Communication', diet: 'universal', desc: 'Make significantly less noise in chat', value: '50%' },
  nocturnal: { name: 'Nocturnal', diet: 'universal', desc: 'Faster health recovery at night', value: '5%' },
  osteosclerosis: { name: 'Osteosclerosis', diet: 'universal', desc: 'Resist or reduce fracture damage', value: '20%' },
  osteophagic: { name: 'Osteophagic', diet: 'carnivore', desc: 'Consume bones to regenerate fractures faster', value: null },
  photosynthetic_regeneration: { name: 'Photosynthetic Regeneration', diet: 'herbivore', desc: 'Regenerate stamina faster during the day', value: '10%' },
  photosynthetic_tissue: { name: 'Photosynthetic Tissue', diet: 'universal', desc: 'Faster health recovery during the day', value: '5%' },
  reabsorption: { name: 'Reabsorption', diet: 'universal', desc: 'Recover water during rain or while swimming', value: '1' },
  reinforced_tendons: { name: 'Reinforced Tendons', diet: 'universal', desc: 'Jumping costs less stamina', value: null },
  reniculate_kidneys: { name: 'Reniulate Kidneys', diet: 'universal', desc: 'Can drink saltwater', value: null },
  sequential_hermaphroditism: { name: 'Sequential Hermaphroditism', diet: 'universal', desc: 'Changes your sex', value: null },
  social_behavior: { name: 'Social Behavior', diet: 'herbivore_omnivore', desc: 'Increased group size (Group Leader Only)', value: null },
  submerged_optical_retention: { name: 'Submerged Optical Retention', diet: 'universal', desc: 'Increased underwater vision range', value: '5%' },
  sustained_hydration: { name: 'Sustained Hydration', diet: 'universal', desc: 'Water drains more slowly', value: '20%' },
  tactile_endurance: { name: 'Tactile Endurance', diet: 'herbivore', desc: 'Convert incoming damage to stamina', value: null },
  traumatic_thrombosis: { name: 'Traumatic Thrombosis', diet: 'universal', desc: 'Prevent death from blood loss if resting', value: null },
  truculency: { name: 'Truculency', diet: 'herbivore', desc: 'Bucking has higher chance to dismount latched animals', value: '5%' },
  wader: { name: 'Wader', diet: 'universal', desc: 'Less hindered when wading through shallow water', value: '25%' },
  xerocole_adaptation: { name: 'Xerocole Adaptation', diet: 'herbivore', desc: 'Gain some water when eating plants', value: '15%' },
  augmented_tapetum: { name: 'Augmented Tapetum', diet: 'carnivore', desc: 'Increased vision at night', value: null },
  enhanced_digestion: { name: 'Enhanced Digestion', diet: 'universal', desc: 'Decrease nutrition decay rate', value: null },
  heightened_ghrelin: { name: 'Heightened Ghrelin', diet: 'universal', desc: 'Increased overeating capacity', value: null },
  multichambered_lungs: { name: 'Multichambered Lungs', diet: 'universal', desc: 'Increases stamina regeneration threshold', value: null },
  parthenogenesis: { name: 'Parthenogenesis', diet: 'universal', desc: 'Lets you nest without a mate (Female Only)', value: null },
  prolific_reproduction: { name: 'Prolific Reproduction', diet: 'universal', desc: 'Babies have increased health/stamina (Female Only)', value: null },
  barometric_sensitivity: { name: 'Barometric Sensitivity', diet: 'herbivore', desc: 'Receive indication prior to storms or droughts', value: null },
  gastronomic_regeneration: { name: 'Gastronomic Regeneration', diet: 'universal', desc: 'Eating restores a small amount of health', value: null },
};

export const DINOS = {
  // Carnivores
  tyrannosaurus: { name: 'Tyrannosaurus', diet: 'carnivore', hasPrime: true },
  allosaurus: { name: 'Allosaurus', diet: 'carnivore', hasPrime: true },
  carnotaurus: { name: 'Carnotaurus', diet: 'carnivore', hasPrime: true },
  ceratosaurus: { name: 'Ceratosaurus', diet: 'carnivore', hasPrime: true },
  deinosuchus: { name: 'Deinosuchus', diet: 'carnivore', hasPrime: true },
  dilophosaurus: { name: 'Dilophosaurus', diet: 'carnivore', hasPrime: true },
  herrerasaurus: { name: 'Herrerasaurus', diet: 'carnivore', hasPrime: true },
  omniraptor: { name: 'Omniraptor', diet: 'carnivore', hasPrime: true },
  pteranodon: { name: 'Pteranodon', diet: 'carnivore', hasPrime: true },
  troodon: { name: 'Troodon', diet: 'carnivore', hasPrime: true },
  austroraptor: { name: 'Austroraptor', diet: 'carnivore', hasPrime: false },
  // Herbivores
  triceratops: { name: 'Triceratops', diet: 'herbivore', hasPrime: true },
  stegosaurus: { name: 'Stegosaurus', diet: 'herbivore', hasPrime: true },
  maiasaura: { name: 'Maiasaura', diet: 'herbivore', hasPrime: true },
  diabloceratops: { name: 'Diabloceratops', diet: 'herbivore', hasPrime: true },
  kentrosaurus: { name: 'Kentrosaurus', diet: 'herbivore', hasPrime: false },
  tenontosaurus: { name: 'Tenontosaurus', diet: 'herbivore', hasPrime: true },
  pachycephalosaurus: { name: 'Pachycephalosaurus', diet: 'herbivore', hasPrime: true },
  dryosaurus: { name: 'Dryosaurus', diet: 'herbivore', hasPrime: true },
  hypsilophodon: { name: 'Hypsilophodon', diet: 'herbivore', hasPrime: true },
  // Omnivores
  beipiaosaurus: { name: 'Beipiaosaurus', diet: 'omnivore', hasPrime: true },
  gallimimus: { name: 'Gallimimus', diet: 'omnivore', hasPrime: true },
  human: { name: 'Human', diet: 'omnivore', hasPrime: false },
  zombie: { name: 'Zombie Dinosaur', diet: 'omnivore', hasPrime: false },
  baryonyx: { name: 'Baryonyx', diet: 'omnivore', hasPrime: true },
  oviraptor: { name: 'Oviraptor', diet: 'omnivore', hasPrime: true },
  camarasaurus: { name: 'Camarasaurus', diet: 'omnivore', hasPrime: true },
  quetzalcoatlus: { name: 'Quetzalcoatlus', diet: 'omnivore', hasPrime: true },
  parasaurolophus: { name: 'Parasaurolophus', diet: 'omnivore', hasPrime: true },
  spinosaurus: { name: 'Spinosaurus', diet: 'omnivore', hasPrime: true },
  avaceratops: { name: 'Avaceratops', diet: 'omnivore', hasPrime: true },
  anklyosaurus: { name: 'Anklyosaurus', diet: 'omnivore', hasPrime: true },
  suchomimus: { name: 'Suchomimus', diet: 'omnivore', hasPrime: true },
  giganotosaurus: { name: 'Giganotosaurus', diet: 'omnivore', hasPrime: true },
  therizinosaurus: { name: 'Therizinosaurus', diet: 'omnivore', hasPrime: true },
};

export const GROWTH_OPTIONS = [40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100];

export function getAvailableMutations(dinoKey, slot) {
  const dino = DINOS[dinoKey];
  if (!dino) return [];
  
  const diet = dino.diet;
  let pool = [];
  
  if (diet === 'carnivore') {
    pool = [...DIET_MUTATIONS.carnivore, ...DIET_MUTATIONS.universal];
  } else if (diet === 'herbivore') {
    pool = [...DIET_MUTATIONS.herbivore, ...DIET_MUTATIONS.universal];
  } else if (diet === 'omnivore') {
    pool = [...DIET_MUTATIONS.omnivore, ...DIET_MUTATIONS.universal];
  }
  
  return pool.map(key => ({
    key,
    name: MUTATION_INFO[key]?.name || key,
    desc: MUTATION_INFO[key]?.desc || '',
    value: MUTATION_INFO[key]?.value || null
  }));
}

export function getSlotMutationRange(slot, isPrime) {
  if (slot === 1) return [40, 50];
  if (slot === 2) return [40, 50];
  if (slot === 3) return [50, 75];
  if (slot === 4) return isPrime ? [75, 100] : null;
  return null;
}

export default { DINOS, DIET_MUTATIONS, MUTATION_INFO, GROWTH_OPTIONS, getAvailableMutations, getSlotMutationRange };
