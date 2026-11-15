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
    passive: { pt: 'Nada no rio lateral em mapas terrestres (+impulso e escudo na água)', en: 'Swims in side river on land tracks with speed & water shield' }
  },
  flying: {
    id: 'flying',
    name: { pt: 'Voador', en: 'Flying' },
    passive: { pt: 'Voa no corredor aéreo acima da pista (+planagem leve e bônus em anéis)', en: 'Flies in sky corridor above tracks with aerial glide & ring bonus' }
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
    habitat: 'amphibious',
    swimProfile: 'surface',
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
    unlockCost: 150,
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
    unlockCost: 150,
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
    unlockCost: 600,
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
    habitat: 'amphibious',
    swimProfile: 'surface',
    unlockCost: 600,
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
    unlockCost: 600,
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
    unlockCost: 2500,
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
    unlockCost: 2500,
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
    unlockCost: 2500,
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
    unlockCost: 2500,
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
    dinoClass: 'flying',
    habitat: 'flying',
    unlockCost: 2500,
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
    unlockCost: 10000,
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
    id: 'iguanodon',
    name: 'Iguanodon',
    dinoClass: 'herbivore',
    unlockCost: 150,
    stats: { speed: 7, jump: 7, hp: 3, defense: 7, attack: 7 },
    ability: { name: 'Espigão de Polegar', desc: 'Avança derrubando obstáculos frontais com escudo curto.', cooldown: 9.0, duration: 2.0 },
    colors: { primary: '#52b788', secondary: '#d8f3dc', eye: '#ffb703', spots: '#2d6a4f', spikes: '#e9c46a' },
    roarPitch: 125,
    fact: {
      pt: 'Possuía polegares em forma de punhal afiado para se defender de predadores.',
      en: 'Had sharp thumb spikes used to defend itself against prehistoric predators.'
    }
  },
  {
    id: 'gallimimus',
    name: 'Gallimimus',
    dinoClass: 'herbivore',
    unlockCost: 150,
    stats: { speed: 10, jump: 8, hp: 2, defense: 5, attack: 6 },
    ability: { name: 'Arranque Relâmpago', desc: 'Velocidade máxima com recarga rápida de estamina e reflexo.', cooldown: 7.5, duration: 2.6 },
    colors: { primary: '#f4a261', secondary: '#fae1dd', eye: '#ffd166', spots: '#e76f51', spikes: '#f77f00' },
    roarPitch: 215,
    fact: {
      pt: 'Um dos dinossauros mais velozes já descobertos, corria como um avestruz gigante.',
      en: 'One of the fastest known dinosaurs, sprinting across plains like a giant ostrich.'
    }
  },
  {
    id: 'deinonychus',
    name: 'Deinonychus',
    dinoClass: 'carnivore',
    unlockCost: 600,
    stats: { speed: 9, jump: 9, hp: 2, defense: 5, attack: 9 },
    ability: { name: 'Salto em Foice', desc: 'Salto duplo acrobático e corte múltiplo de espinhos à frente.', cooldown: 8.5, duration: 2.2 },
    colors: { primary: '#e63946', secondary: '#f1faee', eye: '#ffd166', spots: '#1d3557', spikes: '#ff9f1c' },
    roarPitch: 170,
    fact: {
      pt: 'Inspiração direta dos raptores modernos: emplumado e equipado com garra retrátil fatal.',
      en: 'Feathered pack hunter armed with a deadly retractable sickle claw.'
    }
  },
  {
    id: 'kentrosaurus',
    name: 'Kentrosaurus',
    dinoClass: 'armored',
    unlockCost: 600,
    stats: { speed: 6, jump: 5, hp: 4, defense: 9, attack: 8 },
    ability: { name: 'Muralha de Espinhos', desc: 'Ativa escudo + rajada radial de espinhos ósseos.', cooldown: 10.0, duration: 2.4 },
    colors: { primary: '#bc6c25', secondary: '#dda15e', eye: '#fefae0', spots: '#606c38', spikes: '#f4d35e' },
    roarPitch: 105,
    fact: {
      pt: 'Parente africano do Estegossauro, tinha pontas enormes ao longo dos ombros e da cauda.',
      en: 'African cousin of Stegosaurus bristling with sharp shoulder and tail spikes.'
    }
  },
  {
    id: 'diplodocus',
    name: 'Diplodocus',
    dinoClass: 'herbivore',
    unlockCost: 2500,
    stats: { speed: 7, jump: 5, hp: 4, defense: 8, attack: 9 },
    ability: { name: 'Chicote Supersônico', desc: 'Onda sonora traseira limpa a pista e paralisa rivais.', cooldown: 10.5, duration: 2.0 },
    colors: { primary: '#457b9d', secondary: '#a8dadc', eye: '#ffd166', spots: '#1d3557', spikes: '#e63946' },
    roarPitch: 68,
    fact: {
      pt: 'Sua cauda longa funcionava como um chicote capaz de quebrar a barreira do som.',
      en: 'Its whip-like tail could snap faster than the speed of sound to deter predators.'
    }
  },
  {
    id: 'ceratosaurus',
    name: 'Ceratosaurus',
    dinoClass: 'carnivore',
    unlockCost: 2500,
    stats: { speed: 8, jump: 7, hp: 3, defense: 7, attack: 9 },
    ability: { name: 'Chifrada Sísmica', desc: 'Investida feroz que estilhaça obstáculos e dispara projéteis.', cooldown: 9.0, duration: 2.3 },
    colors: { primary: '#b5179e', secondary: '#ffccd5', eye: '#4cc9f0', spots: '#480ca8', spikes: '#ffd166' },
    roarPitch: 92,
    fact: {
      pt: 'Identificado pelo chifre nasal marcante e cristas vermelhas acima dos olhos.',
      en: 'Recognizable by its prominent nasal horn and bony crests above each eye.'
    }
  },
  {
    id: 'argentinosaurus',
    name: 'Argentinosaurus',
    dinoClass: 'herbivore',
    unlockCost: 10000,
    stats: { speed: 6, jump: 5, hp: 5, defense: 10, attack: 9 },
    ability: { name: 'Pisão Tectônico', desc: 'Imunidade titânica + tremor destrói todos os perigos na tela.', cooldown: 12.0, duration: 2.8 },
    colors: { primary: '#3d5a80', secondary: '#e0fbfc', eye: '#ee6c4d', spots: '#293241', spikes: '#ffd447' },
    roarPitch: 55,
    fact: {
      pt: 'Um dos maiores animais terrestres da história, pesando mais de 70 toneladas.',
      en: 'One of the largest land animals ever discovered, weighing over 70 tons.'
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
  },
  {
    id: 'mosasaurus',
    name: 'Mosasaurus',
    dinoClass: 'aquatic',
    habitat: 'aquatic',
    swimProfile: 'submerge',
    unlockCost: 950,
    stats: { speed: 9, jump: 6, hp: 4, defense: 7, attack: 9 },
    ability: { name: 'Mordida Abissal', desc: 'Avança quebrando troncos/redemoinhos e cria onda maremoto.', cooldown: 8.5, duration: 2.0 },
    colors: { primary: '#0f766e', secondary: '#99f6e4', eye: '#fde047', spots: '#134e4a', spikes: '#2dd4bf' },
    roarPitch: 78,
    fact: {
      pt: 'Colosso dos mares pré-históricos, o Mosassauro tinha duas fileiras de dentes no céu da boca.',
      en: 'Colossus of ancient oceans featuring double rows of recurved palatal teeth.'
    }
  },
  {
    id: 'elasmosaurus',
    name: 'Elasmosaurus',
    dinoClass: 'aquatic',
    habitat: 'aquatic',
    swimProfile: 'surface',
    unlockCost: 1200,
    stats: { speed: 8, jump: 7, hp: 3, defense: 7, attack: 7 },
    ability: { name: 'Jato de Maré', desc: 'Surfa invulnerável em corrente rápida e atrai ovos fluviais.', cooldown: 8.0, duration: 2.2 },
    colors: { primary: '#0284c7', secondary: '#e0f2fe', eye: '#fbbf24', spots: '#1e3a8a', spikes: '#38bdf8' },
    roarPitch: 165,
    fact: {
      pt: 'Seu pescoço comprido possuía mais de 70 vértebras para caçar cardumes sem assustar as presas.',
      en: 'Its ultra-long neck housed over 70 vertebrae to ambush fish schools silently.'
    }
  },
  {
    id: 'dunkleosteus',
    name: 'Dunkleosteus',
    dinoClass: 'aquatic',
    habitat: 'aquatic',
    swimProfile: 'submerge',
    unlockCost: 2200,
    stats: { speed: 7, jump: 5, hp: 5, defense: 10, attack: 10 },
    ability: { name: 'Mandíbula Blindada', desc: 'Escudo de placas ósseas estilhaça todos os obstáculos marinhos.', cooldown: 9.5, duration: 2.5 },
    colors: { primary: '#7c2d12', secondary: '#fed7aa', eye: '#38bdf8', spots: '#431407', spikes: '#f59e0b' },
    roarPitch: 66,
    fact: {
      pt: 'Peixe blindado devoniano com placas ósseas que funcionavam como tesouras hidráulicas.',
      en: 'Devonian armored predator with self-sharpening bony jaw plates.'
    }
  },
  {
    id: 'liopleurodon',
    name: 'Liopleurodon',
    dinoClass: 'aquatic',
    habitat: 'aquatic',
    swimProfile: 'submerge',
    unlockCost: 3500,
    stats: { speed: 9, jump: 7, hp: 4, defense: 8, attack: 9 },
    ability: { name: 'Salto Oceânico', desc: 'Impulso sônico sob as ondas que atrai tesouros e limpa a pista.', cooldown: 8.5, duration: 2.1 },
    colors: { primary: '#1e3a8a', secondary: '#bae6fd', eye: '#4ade80', spots: '#0f172a', spikes: '#72efdd' },
    roarPitch: 84,
    fact: {
      pt: 'Quatro nadadeiras gigantes permitiam acelerações súbitas em mares profundos.',
      en: 'Four colossal flippers allowed explosive underwater lunges.'
    }
  },
  {
    id: 'pteranodon',
    name: 'Pteranodon',
    dinoClass: 'flying',
    habitat: 'flying',
    unlockCost: 850,
    stats: { speed: 9, jump: 9, hp: 3, defense: 5, attack: 7 },
    ability: { name: 'Rasante Supersônico', desc: 'Voo invulnerável corta nuvens, raios e obstáculos aéreos.', cooldown: 8.0, duration: 2.0 },
    colors: { primary: '#d97706', secondary: '#fef3c7', eye: '#38bdf8', spots: '#78350f', spikes: '#ef4444' },
    roarPitch: 245,
    fact: {
      pt: 'Sua crista alongada funcionava como leme aerodinâmico em voos de mais de 70 km/h.',
      en: 'Its cranial crest acted as a natural rudder while gliding across prehistoric seas.'
    }
  },
  {
    id: 'tapejara',
    name: 'Tapejara',
    dinoClass: 'flying',
    habitat: 'flying',
    unlockCost: 1600,
    stats: { speed: 9, jump: 10, hp: 3, defense: 6, attack: 7 },
    ability: { name: 'Correntes Termais', desc: 'Gera redemoinho protetor + atrai ovos e reduz queda por 2.8s.', cooldown: 8.5, duration: 2.8 },
    colors: { primary: '#db2777', secondary: '#fce7f3', eye: '#facc15', spots: '#831843', spikes: '#38bdf8' },
    roarPitch: 270,
    fact: {
      pt: 'Pterossauro brasileiro famoso pela crista colorida gigante que brilhava no sol.',
      en: 'Brazilian pterosaur famous for its vibrant sail-like cranial crest.'
    }
  },
  {
    id: 'dimorphodon',
    name: 'Dimorphodon',
    dinoClass: 'flying',
    habitat: 'flying',
    unlockCost: 2400,
    stats: { speed: 10, jump: 8, hp: 2, defense: 5, attack: 8 },
    ability: { name: 'Bando Aéreo', desc: 'Dispara 3 investidas de vento e limpa perigos do corredor aéreo.', cooldown: 7.5, duration: 1.8 },
    colors: { primary: '#4f46e5', secondary: '#e0e7ff', eye: '#f43f5e', spots: '#312e81', spikes: '#22d3ee' },
    roarPitch: 300,
    fact: {
      pt: 'Possuía dois tipos diferentes de dentes no mesmo bico para agarrar presas no ar.',
      en: 'Featured two distinct tooth shapes in its deep skull for aerial hunting.'
    }
  },
  {
    id: 'utahraptor',
    name: 'Utahraptor',
    dinoClass: 'carnivore',
    habitat: 'land',
    unlockCost: 1800,
    stats: { speed: 10, jump: 9, hp: 3, defense: 6, attack: 9 },
    ability: { name: 'Garra Foice Turbo', desc: 'Salto cortante em sequência destrói barreiras e gera combo x2.', cooldown: 8.0, duration: 2.0 },
    colors: { primary: '#dc2626', secondary: '#fecaca', eye: '#fef08a', spots: '#7f1d1d', spikes: '#f8fafc' },
    roarPitch: 210,
    fact: {
      pt: 'Maior dromeossaurídeo conhecido, armado com garras retráteis de até 24 centímetros.',
      en: 'The largest known dromaeosaurid, sporting sickle claws nearly 24 cm long.'
    }
  },
  {
    id: 'mecha_rex',
    name: 'Mecha-Rex Titan',
    dinoClass: 'carnivore',
    habitat: 'land',
    mecha: true,
    unlockCost: 12000,
    stats: { speed: 9, jump: 8, hp: 4, defense: 10, attack: 10 },
    ability: { name: 'Canhão de Plasma', desc: 'Dispara feixe laser orbital que vaporiza obstáculos + escudo cyber.', cooldown: 9.0, duration: 2.5 },
    colors: { primary: '#475569', secondary: '#cbd5e1', eye: '#38bdf8', spots: '#0f172a', spikes: '#00f5d4' },
    roarPitch: 132,
    fact: {
      pt: 'Colosso biomecânico inspirado nos grandes robôs gigantes, alimentado por núcleo fóssil.',
      en: 'Biomechatronic apex predator powered by an orbital fossil arc-reactor.'
    }
  },
  {
    id: 'cyber_raptor',
    name: 'Raptor Cibernético',
    dinoClass: 'carnivore',
    habitat: 'land',
    mecha: true,
    unlockCost: 6500,
    stats: { speed: 10, jump: 9, hp: 3, defense: 7, attack: 9 },
    ability: { name: 'Overclock Quântico', desc: 'Turbo invulnerável neon com imã automático e corte sônico.', cooldown: 7.5, duration: 2.2 },
    colors: { primary: '#1e293b', secondary: '#7dd3fc', eye: '#f43f5e', spots: '#334155', spikes: '#facc15' },
    roarPitch: 235,
    fact: {
      pt: 'Caçador futurista construído nos laboratórios da Metrópole Mecha.',
      en: 'Futuristic interceptor engineered inside the Mecha Metropolis core.'
    }
  }
];

export function getDinoSpec(id) {
  return DINO_CATALOG.find((d) => d.id === id) || DINO_CATALOG[0];
}

export function getDinoHabitat(specOrId) {
  const spec = typeof specOrId === 'string' ? getDinoSpec(specOrId) : (specOrId || getDinoSpec('trex'));
  if (spec.habitat) return spec.habitat;
  if (spec.id === 'quetzalcoatlus' || spec.dinoClass === 'flying') return 'flying';
  if (spec.dinoClass === 'aquatic') {
    if (spec.id === 'spinosaurus' || spec.id === 'baryonyx') return 'amphibious';
    return 'aquatic';
  }
  return 'land';
}

export function getHybridAvailableModes(hybridCfg = null, mutationId = null) {
  const modes = new Set();
  if (hybridCfg && (hybridCfg.enabled || hybridCfg.body || hybridCfg.head || hybridCfg.tail || hybridCfg.bodyId || hybridCfg.headId || hybridCfg.tailId)) {
    const partIds = [
      hybridCfg.body || hybridCfg.bodyId,
      hybridCfg.head || hybridCfg.headId,
      hybridCfg.tail || hybridCfg.tailId,
      hybridCfg.limbsId
    ].filter(Boolean);
    for (const pid of partIds) {
      const h = getDinoHabitat(pid);
      if (h === 'amphibious') {
        modes.add('land');
        modes.add('aquatic');
      } else {
        modes.add(h);
      }
    }
  }
  if (mutationId === 'extra_limbs') {
    modes.add('land');
  }
  if (modes.size === 0) modes.add('land');
  const order = ['land', 'aquatic', 'flying'];
  return order.filter((m) => modes.has(m));
}

export function getDinoSwimCapabilities(specOrId, { hybrid = null, mutationId = null } = {}) {
  const spec = typeof specOrId === 'string' ? getDinoSpec(specOrId) : (specOrId || getDinoSpec('trex'));
  if (hybrid?.enabled) {
    const availableModes = getHybridAvailableModes(hybrid, mutationId);
    const hasAquatic = availableModes.includes('aquatic');
    if (!hasAquatic) {
      return {
        swimProfile: 'none',
        canSubmerge: false,
        surfaceSwimOnly: false,
        isAmphibious: false,
        swimModeLabel: 'Terrestre / Aéreo',
        swimModeDescription: 'Não possui nado especializado; atravessa rios rasos pela superfície.'
      };
    }
    const partSpecs = [
      hybrid.body || hybrid.bodyId,
      hybrid.head || hybrid.headId,
      hybrid.tail || hybrid.tailId,
      hybrid.limbsId
    ].filter(Boolean).map((id) => getDinoSpec(id));
    const canSubmerge = partSpecs.some((s) => s?.swimProfile === 'submerge');
    const isAmphibious = availableModes.includes('land') || availableModes.includes('flying');
    return {
      swimProfile: canSubmerge ? 'submerge' : 'surface',
      canSubmerge,
      surfaceSwimOnly: !canSubmerge,
      isAmphibious,
      swimModeLabel: canSubmerge
        ? (isAmphibious ? 'Híbrido Submerso (Terra ↔ Água)' : 'Submerso Profundo')
        : (isAmphibious ? 'Híbrido Superfície (Terra ↔ Água)' : 'Nado de Superfície'),
      swimModeDescription: canSubmerge
        ? 'Nada na superfície e mergulha com S/↓ (consome O₂).'
        : 'Hidroplana na superfície da água sem afundar nem gastar O₂.'
    };
  }

  const base = getDinoHabitat(spec);
  const grantsLandWalk = mutationId === 'extra_limbs';
  const isAmphibious = base === 'amphibious' || (base === 'aquatic' && grantsLandWalk);
  const canSubmergeWater = base === 'aquatic' || base === 'amphibious';
  const profile = spec.swimProfile || (base === 'aquatic' ? 'submerge' : base === 'amphibious' ? 'surface' : 'none');

  if (canSubmergeWater) {
    const deepSpecialist = profile === 'submerge';
    return {
      swimProfile: profile,
      canSubmerge: true,
      surfaceSwimOnly: false,
      isAmphibious,
      swimModeLabel: isAmphibious
        ? 'Anfíbio (Terra ↔ Água + Mergulho)'
        : (deepSpecialist ? 'Mergulho Abissal (Brânquias)' : 'Aquático Ágil (Superfície ↔ Submerso)'),
      swimModeDescription: isAmphibious
        ? 'Alterna Terra ↔ Rio lateral (T / X / 🔄). Na água, aperte S/↓ para alternar Superfície ↔ Submerso!'
        : 'Exclusivo do rio/mar lateral. Aperte S/↓ para alternar Superfície ↔ Submerso (gerencie o O₂ nas profundezas) e W/↑ para emergir!'
    };
  }
  return {
    swimProfile: 'none',
    canSubmerge: false,
    surfaceSwimOnly: false,
    isAmphibious: false,
    swimModeLabel: base === 'flying' ? 'Voador (Rotas Aéreas)' : 'Terrestre (Terra + Nado em Rios)',
    swimModeDescription: base === 'flying'
      ? 'Voa pelas rotas aéreas; atravessa mares apenas na superfície.'
      : 'Corre em terra firme; pode nadar e mergulhar ao cruzar rios/oceanos (consome O₂).'
  };
}

export function getEffectiveDinoHabitat(specOrId, { hybrid = null, mutationId = null } = {}) {
  const base = getDinoHabitat(specOrId);
  const grantsLandWalk = mutationId === 'extra_limbs';
  const order = ['land', 'aquatic', 'flying'];
  const swimCaps = getDinoSwimCapabilities(specOrId, { hybrid, mutationId });
  if (hybrid?.enabled) {
    const availableModes = getHybridAvailableModes(hybrid, mutationId);
    const bodyHab = getDinoHabitat(hybrid.body || hybrid.bodyId || 'trex');
    const normBodyHab = bodyHab === 'amphibious' ? 'aquatic' : bodyHab;
    const primary = availableModes.includes(normBodyHab) ? normBodyHab : (availableModes[0] || 'land');
    return { primary, availableModes, grantsLandWalk, canWalkOnLand: availableModes.includes('land'), ...swimCaps };
  }
  const modes = new Set();
  if (base === 'amphibious') {
    modes.add('land');
    modes.add('aquatic');
  } else {
    modes.add(base);
  }
  if (grantsLandWalk) {
    modes.add('land');
  }
  const availableModes = order.filter((m) => modes.has(m));
  return {
    primary: base,
    availableModes,
    grantsLandWalk,
    canWalkOnLand: availableModes.includes('land'),
    ...swimCaps
  };
}
