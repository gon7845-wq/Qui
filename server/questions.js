// Banque de questions de départ (seed).
// Chaque question porte une CLÉ de catégorie (cat). La catégorie définit
// l'ambiance/couleur en jeu (warm / spicy / fun) — voir DEFAULT_CATEGORIES
// dans store.js. L'admin peut ensuite tout réorganiser librement.

export const QUESTIONS = [
  // ─── 💛 Gentillesse (warm) ───
  { text: "Qui est la personne la plus gentille du groupe ?", cat: "gentil" },
  { text: "Qui ferait n'importe quoi pour ses amis ?", cat: "gentil" },
  { text: "Qui a le plus grand cœur ?", cat: "gentil" },
  { text: "Qui est le plus loyal en amitié ?", cat: "gentil" },
  { text: "Qui te ferait rire même dans tes pires jours ?", cat: "gentil" },
  { text: "Qui appellerais-tu à 3h du matin en cas de crise ?", cat: "gentil" },
  { text: "Qui fait les meilleurs câlins du groupe ?", cat: "gentil" },
  { text: "Qui ferait le meilleur parent ?", cat: "gentil" },
  { text: "Qui mérite plus qu'il n'a déjà ?", cat: "gentil" },
  { text: "Qui te manquerait le plus pendant un an de voyage seul ?", cat: "gentil" },
  { text: "Qui sait toujours quoi dire quand ça va mal ?", cat: "gentil" },
  { text: "Qui est le plus authentique du groupe ?", cat: "gentil" },
  { text: "Qui porte le plus lourd sans jamais se plaindre ?", cat: "gentil" },

  // ─── 🦸 Talents (warm) ───
  { text: "Qui ferait le meilleur thérapeute ?", cat: "talents" },
  { text: "Qui ferait le meilleur prof ?", cat: "talents" },
  { text: "Qui ferait le meilleur président ?", cat: "talents" },
  { text: "Qui s'en sortirait avec 50€ pour un mois ?", cat: "talents" },
  { text: "Qui ferait le meilleur cuisinier de restaurant étoilé ?", cat: "talents" },
  { text: "Qui gagnerait un quiz de culture générale ?", cat: "talents" },

  // ─── 👥 Le groupe (warm) ───
  { text: "Qui rend tout le monde de bonne humeur en arrivant ?", cat: "groupe" },
  { text: "Qui est la maman du groupe ?", cat: "groupe" },
  { text: "Qui est le papa du groupe ?", cat: "groupe" },
  { text: "Qui organise toujours tout ?", cat: "groupe" },
  { text: "Qui ramène la meilleure énergie en soirée ?", cat: "groupe" },
  { text: "Qui calme le jeu quand ça part en vrille ?", cat: "groupe" },

  // ─── 😂 Drôle (fun) ───
  { text: "Qui rit le plus à ses propres blagues ?", cat: "drole" },
  { text: "Qui ferait le pire DJ de mariage ?", cat: "drole" },
  { text: "Qui chante le plus faux sous la douche ?", cat: "drole" },
  { text: "Qui parle le plus pendant un film ?", cat: "drole" },
  { text: "Qui pose les questions les plus bizarres ?", cat: "drole" },
  { text: "Qui passerait 3h à se prendre en photo ?", cat: "drole" },
  { text: "Qui se perd dans son propre quartier ?", cat: "drole" },
  { text: "Qui prend les pires décisions en soirée ?", cat: "drole" },
  { text: "Qui raconte la même histoire pour la 100ème fois ?", cat: "drole" },
  { text: "Qui parle à son chien comme à un humain ?", cat: "drole" },
  { text: "Qui danse le plus mal mais le plus fort ?", cat: "drole" },
  { text: "Qui crie le plus dans une fête foraine ?", cat: "drole" },
  { text: "Qui rate son réveil chaque matin ?", cat: "drole" },
  { text: "Qui ferait le pire imitateur de Macron ?", cat: "drole" },
  { text: "Qui parle tout seul quand personne ne regarde ?", cat: "drole" },
  { text: "Qui chante du Céline Dion en cachette ?", cat: "drole" },
  { text: "Qui paye toujours sa part au centime près ?", cat: "drole" },

  // ─── 🔮 Prédictions (fun) ───
  { text: "Qui sera le plus riche dans 10 ans ?", cat: "futur" },
  { text: "Qui se mariera en premier ?", cat: "futur" },
  { text: "Qui aura le plus d'enfants ?", cat: "futur" },
  { text: "Qui vivra à l'étranger ?", cat: "futur" },
  { text: "Qui deviendra célèbre ?", cat: "futur" },
  { text: "Qui aura la plus belle maison ?", cat: "futur" },
  { text: "Qui changera complètement de vie à 40 ans ?", cat: "futur" },
  { text: "Qui aura le job le plus impressionnant ?", cat: "futur" },
  { text: "Qui ne vieillira jamais vraiment dans sa tête ?", cat: "futur" },

  // ─── 👽 Absurde (fun) ───
  { text: "Qui survivrait sur une île déserte ?", cat: "absurde" },
  { text: "Qui serait le meilleur dans Koh-Lanta ?", cat: "absurde" },
  { text: "Qui survivrait à une apocalypse zombie ?", cat: "absurde" },
  { text: "Qui serait l'imposteur dans Among Us ?", cat: "absurde" },
  { text: "Qui se ferait éliminer en premier dans Squid Game ?", cat: "absurde" },
  { text: "Qui mangerait un insecte pour 100€ ?", cat: "absurde" },
  { text: "Qui appellerait sa mère en premier en cas de problème ?", cat: "absurde" },
  { text: "Qui monterait une secte qui marche vraiment ?", cat: "absurde" },
  { text: "Qui rejoindrait une secte sans s'en rendre compte ?", cat: "absurde" },
  { text: "Qui ferait le meilleur cambrioleur ?", cat: "absurde" },
  { text: "Qui gagnerait une bagarre de bar ?", cat: "absurde" },
  { text: "Qui irait combattre un ours pour de l'argent ?", cat: "absurde" },
  { text: "Qui ferait le pire candidat de télé-réalité ?", cat: "absurde" },
  { text: "Qui paniquerait en premier dans un avion qui tremble ?", cat: "absurde" },
  { text: "Qui parlerait à un fantôme par pure curiosité ?", cat: "absurde" },
  { text: "Qui vendrait un rein pour partir en vacances ?", cat: "absurde" },
  { text: "Qui aurait survécu à une autre époque ?", cat: "absurde" },

  // ─── 🧠 Philo (fun) ───
  { text: "Qui semble avoir tout compris à la vie ?", cat: "philo" },
  { text: "Qui est le plus en paix avec lui-même ?", cat: "philo" },
  { text: "Qui sera le plus regretté le jour où il partira ?", cat: "philo" },
  { text: "Qui pense à la mort un peu trop souvent ?", cat: "philo" },
  { text: "Qui vit comme si demain n'existait pas ?", cat: "philo" },
  { text: "Qui a le plus changé ces dernières années ?", cat: "philo" },
  { text: "Qui cache le mieux ses vraies émotions ?", cat: "philo" },

  // ─── 💔 Couple (spicy) ───
  { text: "Qui est le plus toxique en couple ?", cat: "couple" },
  { text: "Qui est le plus jaloux secrètement ?", cat: "couple" },
  { text: "Qui fait le moins d'efforts en relation ?", cat: "couple" },
  { text: "Qui a déjà ghosté quelqu'un sans pitié ?", cat: "couple" },
  { text: "Qui stalke le plus ses ex ?", cat: "couple" },
  { text: "Qui ment sur son nombre de partenaires ?", cat: "couple" },
  { text: "Qui sera le premier à divorcer ?", cat: "couple" },
  { text: "Qui finira seul avec 7 chats ?", cat: "couple" },

  // ─── 😬 Gênant (spicy) ───
  { text: "Qui a la galerie photo la plus suspecte ?", cat: "genant" },
  { text: "Qui a déjà envoyé un message à la mauvaise personne ?", cat: "genant" },
  { text: "Qui a la pire playlist secrète ?", cat: "genant" },
  { text: "Qui oublie son portefeuille à chaque sortie ?", cat: "genant" },
  { text: "Qui a déjà fait semblant de connaître une chanson ?", cat: "genant" },

  // ─── 🔥 Sans pitié (spicy) ───
  { text: "Qui ment le plus souvent ?", cat: "trash" },
  { text: "Qui ne pourrait pas garder un secret 24h ?", cat: "trash" },
  { text: "Qui te trahirait pour un million d'euros ?", cat: "trash" },
  { text: "Qui parle le plus dans le dos des autres ?", cat: "trash" },
  { text: "Qui est le plus égoïste sans s'en rendre compte ?", cat: "trash" },
  { text: "Qui changerait totalement s'il devenait riche ?", cat: "trash" },
  { text: "Qui pense être bien meilleur qu'il ne l'est ?", cat: "trash" },
  { text: "Qui a l'ego le plus fragile ?", cat: "trash" },
  { text: "Qui se prend beaucoup trop au sérieux ?", cat: "trash" },
  { text: "Qui regarde son téléphone pendant qu'on lui parle ?", cat: "trash" },
  { text: "Qui juge les autres en silence ?", cat: "trash" },
  { text: "Qui craquerait en premier sous la torture ?", cat: "trash" },
  { text: "Qui est le plus dramatique du groupe ?", cat: "trash" },
  { text: "Qui annule toujours à la dernière minute ?", cat: "trash" },
  { text: "Qui arrive systématiquement en retard ?", cat: "trash" },
  { text: "Qui sait le mieux mentir en gardant son sang-froid ?", cat: "trash" },
  { text: "Qui ferait fortune dans l'arnaque ?", cat: "trash" },
];
