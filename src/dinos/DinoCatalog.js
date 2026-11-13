// Catálogo completo de 20 dinossauros (19 + 1 secreto) com atributos balanceados, classes, habilidades e custos.

export const DINO_CLASSES = {
  carnivore: {
    id: 'carnivore',
    name: { pt: 'Carnívoro', en: 'Carnivore' },
    passive: { pt: '+25% pontos ao pisotear/atacar (Q) e combos mais rápidos', en: '+25% stomp/attack score & faster combo charge' }
  },
  herbivore: {
    id: 'herbivore',
    name: { pt: 'Herbívoro', en: 'Herbivore' },
    passive: { pt: '+1 Escudo inicial e frutas concedem +18 Fúria + chance de escudo', en: '+1 starting shield & fruits grant extra fury' }
  },
  aquatic: {
    id: 'aquatic',
    name: { pt: 'Aquático', en: 'Aquatic' },
    passive: { pt: 'Corre na água/lama sem lentidão e ganha impulso no rio', en: 'No slowdown in water/mud & river speed boost' }
  },
  mystic: {
    id: 'mystic',
    name: { pt: 'Místico', en: 'Mystic' },
    passive: { pt: 'Atrai ovos próximos e emite aura espectral', en: 'Attracts nearby eggs & emits spectral aura' }
  }
};

export const DINO_CATALOG = [
  {
    id: 'trex',
    name: 'T-Rex',
    dinoClass: 'carnivore',
    unlockCost: 0,
    stats: { speed: 7, jump: 7, hp: 3, defense: 6, attack: 9 },
    ability: { name: 'Rugido', desc: 'Afasta e destrói obstáculos pequenos e aves à frente.', cooldown: 9.5, duration: 1.5 },
    colors: { primary: '#3fa34d', secondary: '#c7e89b', eye: '#ffd54f', spots: '#1e5b2b', spikes: '#e87a24' },
    roarPitch: 95,
    fact: {
      pt: 'O Tyrannosaurus rex tinha uma mordida com força superior a 5 toneladas, capaz de triturar ossos.',
      en: 'Tyrannosaurus rex had a bite force exceeding 5 tons, strong enough to crush solid bone.'
    }
  },
  {
    id: 'raptor',
    name: 'Velociraptor',
    dinoClass: 'carnivore',
    unlockCost: 0,
    stats: { speed: 10, jump: 8, hp: 2, defense: 4, attack: 8 },
    ability: { name: 'Investida Relâmpago', desc: 'Avanço invencível em alta velocidade que destrói obstáculos.', cooldown: 8.0, duration: 1.3 },
    colors: { primary: '#d96b27', secondary: '#ffe0a3', eye: '#fff176', spots: '#6e2307', spikes: '#ffb703' },
    roarPitch: 290,
    fact: {
      pt: 'Na vida real, o Velociraptor tinha cerca de 2 metros de comprimento e possuía penas.',
      en: 'In real life, Velociraptor was about 2 meters long and covered in feathers.'
    }
  },
  {
    id: 'triceratops',
    name: 'Triceratops',
    dinoClass: 'herbivore',
    unlockCost: 0,
    stats: { speed: 6, jump: 5, hp: 4, defense: 9, attack: 7 },
    ability: { name: 'Carga de Chifres', desc: 'Destrói obstáculos à frente com os 3 chifres por 2.8s.', cooldown: 10.5, duration: 2.8 },
    colors: { primary: '#3b82c4', secondary: '#b9e3ff', eye: '#ffd54f', spots: '#18426e', spikes: '#f5efe0' },
    roarPitch: 110,
    fact: {
      pt: 'Seu escudo ósseo no pescoço podia atingir até 1 metro de largura para proteção contra predadores.',
      en: 'Its bony neck frill could grow up to 1 meter wide to shield against large predators.'
    }
  },
  {
    id: 'stegosaurus',
    name: 'Stegosaurus',
    dinoClass: 'herbivore',
    unlockCost: 0,
    stats: { speed: 6, jump: 6, hp: 4, defense: 8, attack: 7 },
    ability: { name: 'Cauda de Espinhos', desc: 'Dispara uma explosão radial de espinhos ao redor.', cooldown: 8.5, duration: 1.2 },
    colors: { primary: '#569c3c', secondary: '#e4f1a8', eye: '#ffeb3b', spots: '#2c591d', spikes: '#e0533c' },
    roarPitch: 135,
    fact: {
      pt: 'Apesar do tamanho de um ônibus, o cérebro do Stegosaurus tinha o tamanho aproximado de uma noz.',
      en: 'Despite being bus-sized, Stegosaurus had a brain roughly the size of a walnut.'
    }
  },
  {
    id: 'ankylosaurus',
    name: 'Ankylosaurus',
    dinoClass: 'herbivore',
    unlockCost: 0,
    stats: { speed: 5, jump: 5, hp: 5, defense: 10, attack: 6 },
    ability: { name: 'Casco de Aço', desc: 'Fica imune a todo dano por 3.5s com proteção reforçada.', cooldown: 11.5, duration: 3.5 },
    colors: { primary: '#7c6f64', secondary: '#d5c4a1', eye: '#ff9800', spots: '#3c3836', spikes: '#b8bb26' },
    roarPitch: 82,
    fact: {
      pt: 'Até suas pálpebras tinham placas ósseas blindadas para se defender de ataques.',
      en: 'Even its eyelids were reinforced with bony armor plates for defense.'
    }
  },
  {
    id: 'spinosaurus',
    name: 'Spinosaurus',
    dinoClass: 'aquatic',
    unlockCost: 0,
    stats: { speed: 8, jump: 7, hp: 3, defense: 7, attack: 8 },
    ability: { name: 'Mergulho', desc: 'Mergulha invulnerável por baixo de obstáculos por 2s.', cooldown: 8.5, duration: 2.0 },
    colors: { primary: '#1f8a8c', secondary: '#9ce6e0', eye: '#ffca3a', spots: '#0d464a', spikes: '#ff6b35' },
    roarPitch: 105,
    fact: {
      pt: 'O Spinosaurus foi o maior dinossauro carnívoro conhecido e caçava peixes gigantes em rios.',
      en: 'Spinosaurus was the largest known carnivorous dinosaur and hunted giant fish in ancient rivers.'
    }
  },
  {
    id: 'brachiosaurus',
    name: 'Brachiosaurus',
    dinoClass: 'herbivore',
    unlockCost: 0,
    stats: { speed: 6, jump: 9, hp: 4, defense: 8, attack: 7 },
    ability: { name: 'Pisão Sísmico', desc: 'Onda de choque destrói inimigos e obstáculos na tela.', cooldown: 11.5, duration: 1.4 },
    colors: { primary: '#49a078', secondary: '#c9f0d8', eye: '#ffd166', spots: '#216869', spikes: '#9cc5a1' },
    roarPitch: 70,
    fact: {
      pt: 'Seu pescoço comprido permitia alcançar folhas a mais de 12 metros de altura.',
      en: 'Its long neck allowed it to browse treetop foliage more than 12 meters above ground.'
    }
  },
  {
    id: 'dilophosaurus',
    name: 'Dilophosaurus',
    dinoClass: 'carnivore',
    unlockCost: 0,
    stats: { speed: 9, jump: 8, hp: 2, defense: 5, attack: 8 },
    ability: { name: 'Cuspe de Veneno', desc: 'Lança 3 projéteis ácidos que dissolvem obstáculos à frente.', cooldown: 7.0, duration: 1.8 },
    colors: { primary: '#5e60ce', secondary: '#b8c0ff', eye: '#80ffdb', spots: '#240046', spikes: '#ff4d6d' },
    roarPitch: 340,
    fact: {
      pt: 'Tinha duas cristas ósseas finas no topo da cabeça, provavelmente usadas para exibição.',
      en: 'It sported two thin bony crests on its skull, likely used for visual display.'
    }
  },
  {
    id: 'parasaurolophus',
    name: 'Parasaurolophus',
    dinoClass: 'herbivore',
    unlockCost: 60,
    stats: { speed: 7, jump: 7, hp: 3, defense: 6, attack: 6 },
    ability: { name: 'Trombeta Sônica', desc: 'Atrai ovos próximos e cura aliado no Coop.', cooldown: 9.0, duration: 3.2 },
    colors: { primary: '#e07a5f', secondary: '#f4f1de', eye: '#f2cc8f', spots: '#7a2e1d', spikes: '#3d405b' },
    roarPitch: 195,
    fact: {
      pt: 'Sua crista tubular era oca e funcionava como um trombone natural para produzir sons graves.',
      en: 'Its long hollow crest worked like a natural brass instrument to resonate low calls.'
    }
  },
  {
    id: 'compsognathus',
    name: 'Compsognathus',
    dinoClass: 'carnivore',
    unlockCost: 75,
    stats: { speed: 9, jump: 9, hp: 2, defense: 3, attack: 9 },
    ability: { name: 'Salto Duplo + Furtividade', desc: 'Salto duplo e fase fantasma curta para desviar de perigos.', cooldown: 6.5, duration: 2.0 },
    colors: { primary: '#70e000', secondary: '#e8fccf', eye: '#ffffff', spots: '#007200', spikes: '#ffaa00' },
    roarPitch: 420,
    fact: {
      pt: 'Era do tamanho aproximado de uma galinha e corria em alta velocidade atrás de pequenos insetos.',
      en: 'Roughly the size of a chicken, it sprinted quickly to catch small lizards and insects.'
    }
  },
  {
    id: 'allosaurus',
    name: 'Allosaurus',
    dinoClass: 'carnivore',
    unlockCost: 95,
    stats: { speed: 8, jump: 7, hp: 3, defense: 6, attack: 10 },
    ability: { name: 'Frenesi Caçador', desc: 'Recarga do Ataque (Q) pela metade por 4s e golpe mais forte.', cooldown: 8.5, duration: 4.0 },
    colors: { primary: '#2b9348', secondary: '#d8f3dc', eye: '#ff9f1c', spots: '#1b4332', spikes: '#ef233c' },
    roarPitch: 118,
    fact: {
      pt: 'Principal predador do Jurássico Superior, caçava em grupo usando cristas acima dos olhos.',
      en: 'Apex Late Jurassic hunter sporting distinctive brow crests over its eyes.'
    }
  },
  {
    id: 'baryonyx',
    name: 'Baryonyx',
    dinoClass: 'aquatic',
    unlockCost: 115,
    stats: { speed: 8, jump: 7, hp: 3, defense: 7, attack: 8 },
    ability: { name: 'Corte Aquático', desc: 'Rajada d’água destrói obstáculos e concede +1 Escudo se estiver na água.', cooldown: 9.0, duration: 2.0 },
    colors: { primary: '#0077b6', secondary: '#caf0f8', eye: '#ffd166', spots: '#03045e', spikes: '#48cae4' },
    roarPitch: 140,
    fact: {
      pt: 'Seu nome significa "Garra Pesada", com focinho alongado parecido com o de um crocodilo.',
      en: 'Named "Heavy Claw", it featured a long crocodilian snout built for catching fish.'
    }
  },
  {
    id: 'carnotaurus',
    name: 'Carnotaurus',
    dinoClass: 'carnivore',
    unlockCost: 130,
    stats: { speed: 9, jump: 7, hp: 3, defense: 6, attack: 9 },
    ability: { name: 'Investida Brutal', desc: 'Avança quebrando obstáculos e empurra rivais no PvP/Multiplayer.', cooldown: 8.5, duration: 2.0 },
    colors: { primary: '#b51724', secondary: '#f5b7b1', eye: '#ffdd00', spots: '#4a060b', spikes: '#212529' },
    roarPitch: 120,
    fact: {
      pt: 'Tinha chifres curtos sobre os olhos e braços ainda menores que os do T-Rex.',
      en: 'It had twin horns above its eyes and arms even smaller than those of T-Rex.'
    }
  },
  {
    id: 'pachycephalosaurus',
    name: 'Pachycephalosaurus',
    dinoClass: 'herbivore',
    unlockCost: 145,
    stats: { speed: 7, jump: 7, hp: 4, defense: 8, attack: 8 },
    ability: { name: 'Marretada', desc: 'Cabeçada demolidora que quebra pedras e atordoa rivais.', cooldown: 8.0, duration: 2.0 },
    colors: { primary: '#b5651d', secondary: '#f3d5b5', eye: '#ffd166', spots: '#582f0e', spikes: '#ffe8d6' },
    roarPitch: 155,
    fact: {
      pt: 'O domo ósseo no topo do crânio chegava a 25 centímetros de espessura!',
      en: 'The solid bone dome atop its skull could measure up to 25 centimeters thick!'
    }
  },
  {
    id: 'styracosaurus',
    name: 'Styracosaurus',
    dinoClass: 'herbivore',
    unlockCost: 165,
    stats: { speed: 6, jump: 6, hp: 4, defense: 9, attack: 8 },
    ability: { name: 'Coroa de Espinhos', desc: 'Ganha +1 Escudo temporário e lança espinhos frontais.', cooldown: 10.0, duration: 2.2 },
    colors: { primary: '#bc4749', secondary: '#f2e8cf', eye: '#ffca3a', spots: '#6a040f', spikes: '#f8edeb' },
    roarPitch: 108,
    fact: {
      pt: 'Sua gola tinha 6 longos chifres em leque e um grande chifre nasal intimidador.',
      en: 'Its neck frill featured six long radiating horns and a massive nasal spike.'
    }
  },
  {
    id: 'oviraptor',
    name: 'Oviraptor',
    dinoClass: 'carnivore',
    unlockCost: 180,
    stats: { speed: 9, jump: 8, hp: 2, defense: 4, attack: 9 },
    ability: { name: 'Instinto Coletor', desc: 'Imã amplo temporário + combo acelerado ao quebrar com Q.', cooldown: 10.0, duration: 3.0 },
    colors: { primary: '#f72585', secondary: '#ffe5ec', eye: '#4cc9f0', spots: '#7209b7', spikes: '#ffd166' },
    roarPitch: 360,
    fact: {
      pt: 'Na verdade era um pai cuidadoso que chocava seus ovos em ninhos circulares como aves.',
      en: 'Far from an egg thief, fossils proved it brooded nests carefully like modern birds.'
    }
  },
  {
    id: 'therizinosaurus',
    name: 'Therizinosaurus',
    dinoClass: 'herbivore',
    unlockCost: 195,
    stats: { speed: 7, jump: 7, hp: 3, defense: 7, attack: 10 },
    ability: { name: 'Corte Duplo', desc: 'Destrói obstáculos em arco duplo e rebate projéteis inimigos.', cooldown: 8.0, duration: 1.6 },
    colors: { primary: '#6c5ce7', secondary: '#dcd6f7', eye: '#00cec9', spots: '#2d256e', spikes: '#fdcb6e' },
    roarPitch: 210,
    fact: {
      pt: 'Possuía as maiores garras já registradas na Terra, podendo passar de 1 metro cada.',
      en: 'It grew the longest claws of any known animal, reaching up to 1 meter in length.'
    }
  },
  {
    id: 'quetzalcoatlus',
    name: 'Quetzalcoatlus',
    dinoClass: 'mystic',
    unlockCost: 220,
    stats: { speed: 9, jump: 10, hp: 2, defense: 4, attack: 7 },
    ability: { name: 'Voo Rasante', desc: 'Plana acima dos perigos terrestres com controle aéreo por 2.6s.', cooldown: 9.5, duration: 2.6 },
    colors: { primary: '#f4a261', secondary: '#fefae0', eye: '#2a9d8f', spots: '#e76f51', spikes: '#264653' },
    roarPitch: 285,
    fact: {
      pt: 'Com envergadura de até 10 metros, foi um dos maiores seres voadores da história da Terra.',
      en: 'With a 10-meter wingspan, it ranks among the largest flying creatures ever discovered.'
    }
  },
  {
    id: 'giganotosaurus',
    name: 'Giganotosaurus',
    dinoClass: 'carnivore',
    unlockCost: 260,
    stats: { speed: 7, jump: 6, hp: 4, defense: 8, attack: 10 },
    ability: { name: 'Terremoto Apex', desc: 'Onda de choque massiva limpa a pista à frente e atordoa rivais.', cooldown: 11.0, duration: 1.8 },
    colors: { primary: '#4a4e69', secondary: '#e9ecef', eye: '#ff4d6d', spots: '#22223b', spikes: '#ff9f1c' },
    roarPitch: 75,
    fact: {
      pt: 'Descoberto na Argentina, rivalizava com o T-Rex em tamanho e caçava enormes saurópodes.',
      en: 'Discovered in Patagonia, this giant predator hunted colossal sauropod dinosaurs.'
    }
  },
  {
    id: 'ghostgold',
    name: 'Dino Dourado/Fantasma',
    secret: true,
    unlockCost: 0,
    dinoClass: 'mystic',
    stats: { speed: 10, jump: 10, hp: 4, defense: 9, attack: 10 },
    ability: { name: 'Transcendência Espectral', desc: 'Fica intangível, dobra pontos e invoca chuva moderada de ovos.', cooldown: 9.5, duration: 3.2 },
    colors: { primary: '#ffd447', secondary: '#fff8d6', eye: '#48f5ff', spots: '#ff9f1c', spikes: '#ffffff' },
    roarPitch: 260,
    fact: {
      pt: 'Lenda secreta de Dino Dash 3D: combina a energia fóssil com o brilho estelar.',
      en: 'Secret legend of Dino Dash 3D: fuses ancient fossil power with stardust.'
    }
  }
];

export function getDinoSpec(id) {
  return DINO_CATALOG.find((d) => d.id === id) || DINO_CATALOG[0];
}
