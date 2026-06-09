import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, ComponentType } from 'discord.js';
import { DINOS, getAvailableMutations, getSlotMutationRange, MUTATION_INFO } from '../economy/dinos.js';
import { purchaseDino, getDinoPrice, getSetting } from '../economy/inventory.js';
import { getBalance } from '../economy/coins.js';

const buyState = new Map();

export const data = new SlashCommandBuilder()
  .setName('buy')
  .setDescription('Buy a dinosaur with coins');

export async function execute(interaction) {
  await interaction.deferReply({ ephemeral: true });
  const userId = interaction.user.id;
  buyState.delete(userId);
  
  buyState.set(userId, { step: 'species', dinoKey: null, gender: null, growth: null, isPrime: false, mutations: [null,null,null,null], speciesPage: 0 });
  
  const view = buildSpeciesView(userId);
  const msg = await interaction.editReply({ embeds: [view.embed], components: view.components });
  buyState.get(userId).msgId = msg.id;
  
  const collector = msg.createMessageComponentCollector({ time: 300000, filter: i => i.user.id === userId });
  
  collector.on('collect', async i => {
    const state = buyState.get(userId);
    if (!state) { collector.stop(); return; }
    
    if (i.customId === 'cancel') {
      buyState.delete(userId);
      await i.update({ embeds: [new EmbedBuilder().setTitle('❌ Cancelled').setColor(0xff0000)], components: [] });
      collector.stop();
      return;
    }
    
    if (i.customId === 'page_prev') { state.speciesPage = Math.max(0, (state.speciesPage||0)-1); const v = buildSpeciesView(userId); await i.update({ embeds: [v.embed], components: v.components }); return; }
    if (i.customId === 'page_next') { state.speciesPage = (state.speciesPage||0)+1; const v = buildSpeciesView(userId); await i.update({ embeds: [v.embed], components: v.components }); return; }
    
    if (i.customId === 'species_select') {
      state.dinoKey = i.values[0].replace('species_', '');
      state.step = 'gender';
      const v = buildGenderView(userId);
      await i.update({ embeds: [v.embed], components: v.components });
      return;
    }
    
    if (i.customId === 'gender_male' || i.customId === 'gender_female') {
      state.gender = i.customId === 'gender_male' ? 'male' : 'female';
      state.step = 'growth';
      const v = buildGrowthView(userId);
      await i.update({ embeds: [v.embed], components: v.components });
      return;
    }
    
    if (i.customId === 'growth_select') {
      state.growth = parseInt(i.values[0]);
      state.step = 'prime';
      const v = buildPrimeView(userId);
      await i.update({ embeds: [v.embed], components: v.components });
      return;
    }
    
    if (i.customId === 'prime_yes' || i.customId === 'prime_no') {
      state.isPrime = i.customId === 'prime_yes' && !!DINOS[state.dinoKey]?.hasPrime;
      state.mutations[3] = null;
      state.step = 'mutations';
      const v = buildMutationView(userId);
      await i.update({ embeds: [v.embed], components: v.components });
      return;
    }
    
    if (i.customId.startsWith('mutation_')) {
      const slot = parseInt(i.customId.replace('mutation_', ''));
      state.mutations[slot] = i.values[0];
      const v = buildMutationView(userId);
      await i.update({ embeds: [v.embed], components: v.components });
      return;
    }
    
    if (i.customId === 'summary') {
      state.step = 'summary';
      const v = buildSummaryView(userId);
      await i.update({ embeds: [v.embed], components: v.components });
      return;
    }
    
    if (i.customId === 'confirm') {
      const result = await purchaseDino(userId, state.dinoKey, state.gender, state.growth, state.isPrime, state.mutations);
      buyState.delete(userId);
      
      if (!result.success) {
        await i.update({ embeds: [new EmbedBuilder().setTitle('❌ Failed').setDescription(result.message).setColor(0xff0000)], components: [] });
      } else {
        const dino = DINOS[state.dinoKey];
        const symbol = await getSetting('currency_symbol') || '🪙';
        const muts = state.mutations.filter(Boolean).map(m => MUTATION_INFO[m]?.name || m).join(', ') || 'None';
        const embed = new EmbedBuilder().setTitle('✅ Purchased!').setDescription(`**${state.isPrime ? 'Prime ' : ''}${dino.name}**`)
          .addFields(
            { name: 'Gender', value: state.gender === 'male' ? '♂ Male' : '♀ Female', inline: true },
            { name: 'Growth', value: `${state.growth}%`, inline: true },
            { name: 'Prime', value: state.isPrime ? '✅' : '❌', inline: true },
            { name: 'Mutations', value: muts, inline: false },
            { name: 'Cost', value: `${result.price} ${symbol}`, inline: true },
            { name: 'New Balance', value: `${result.newBalance} ${symbol}`, inline: true }
          ).setColor(0x2ecc71);
        await i.update({ embeds: [embed], components: [] });
      }
      collector.stop();
      return;
    }
    
    if (i.customId === 'back') {
      const steps = { mutations: 'prime', prime: 'growth', growth: 'gender', gender: 'species', summary: 'mutations' };
      const prev = steps[state.step];
      if (prev === 'species') { state.speciesPage = 0; const v = buildSpeciesView(userId); await i.update({ embeds: [v.embed], components: v.components }); }
      else if (prev === 'gender') { const v = buildGenderView(userId); await i.update({ embeds: [v.embed], components: v.components }); }
      else if (prev === 'growth') { const v = buildGrowthView(userId); await i.update({ embeds: [v.embed], components: v.components }); }
      else if (prev === 'prime') { const v = buildPrimeView(userId); await i.update({ embeds: [v.embed], components: v.components }); }
      else if (prev === 'mutations') { const v = buildMutationView(userId); await i.update({ embeds: [v.embed], components: v.components }); }
      state.step = prev;
      return;
    }
  });
  
  collector.on('end', () => buyState.delete(userId));
}

async function buildSpeciesView(userId) {
  const state = buyState.get(userId);
  const keys = Object.keys(DINOS);
  const pageSize = 12;
  const totalPages = Math.ceil(keys.length / pageSize);
  const page = Math.min(state.speciesPage || 0, totalPages - 1);
  state.speciesPage = page;
  const pageKeys = keys.slice(page * pageSize, page * pageSize + pageSize);
  
  const options = pageKeys.map(k => ({ label: DINOS[k].name, value: `species_${k}`, description: `${DINOS[k].diet}${DINOS[k].hasPrime ? ' | Prime' : ''}` }));
  
  const embed = new EmbedBuilder().setTitle('🦕 Buy Dinosaur').setDescription('Select a species').setFooter({ text: `Page ${page+1}/${totalPages}` }).setColor(0x3498db);
  const rows = [
    new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId('species_select').setPlaceholder('Choose a species...').addOptions(options))
  ];
  const nav = [];
  if (totalPages > 1) {
    nav.push(new ButtonBuilder().setCustomId('page_prev').setLabel('◀').setStyle(ButtonStyle.Secondary).setDisabled(page === 0));
    nav.push(new ButtonBuilder().setCustomId('page_next').setLabel('▶').setStyle(ButtonStyle.Secondary).setDisabled(page === totalPages - 1));
  }
  nav.push(new ButtonBuilder().setCustomId('cancel').setLabel('Cancel').setStyle(ButtonStyle.Danger));
  rows.push(new ActionRowBuilder().addComponents(nav));
  return { embed, components: rows };
}

async function buildGenderView(userId) {
  const state = buyState.get(userId);
  const dino = DINOS[state.dinoKey];
  const price = await getDinoPrice(state.dinoKey);
  const symbol = await getSetting('currency_symbol') || '🪙';
  const balance = await getBalance(userId);
  
  const embed = new EmbedBuilder().setTitle(`🦕 ${dino.name}`).setDescription(`Diet: **${dino.diet}** | Prime: ${dino.hasPrime ? '✅' : '❌'}`)
    .addFields({ name: '💰 Price', value: `${price} ${symbol}`, inline: true }, { name: '💳 Balance', value: `${balance} ${symbol}`, inline: true })
    .setColor(0x3498db);
  const rows = [new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('gender_male').setLabel('♂ Male').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('gender_female').setLabel('♀ Female').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('back').setLabel('◀ Back').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('cancel').setLabel('Cancel').setStyle(ButtonStyle.Danger)
  )];
  return { embed, components: rows };
}

async function buildGrowthView(userId) {
  const options = [40,45,50,55,60,65,70,75,80,85,90,95,100].map(g => ({ label: `${g}%`, value: String(g) }));
  const embed = new EmbedBuilder().setTitle('📊 Select Growth').setDescription('Choose growth percentage').setColor(0x3498db);
  const rows = [
    new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId('growth_select').setPlaceholder('Select growth %...').addOptions(options)),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('back').setLabel('◀ Back').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('cancel').setLabel('Cancel').setStyle(ButtonStyle.Danger)
    )
  ];
  return { embed, components: rows };
}

async function buildPrimeView(userId) {
  const state = buyState.get(userId);
  if (!DINOS[state.dinoKey]?.hasPrime) {
    state.isPrime = false;
    return buildMutationView(userId);
  }
  const embed = new EmbedBuilder().setTitle('⭐ Prime?').setDescription('Is this a Prime?').setColor(0x3498db);
  const rows = [new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('prime_yes').setLabel('✅ Prime').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('prime_no').setLabel('❌ Normal').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('back').setLabel('◀ Back').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('cancel').setLabel('Cancel').setStyle(ButtonStyle.Danger)
  )];
  return { embed, components: rows };
}

async function buildMutationView(userId) {
  const state = buyState.get(userId);
  const available = getAvailableMutations(state.dinoKey);
  const slotCount = state.isPrime ? 4 : 3;
  const rows = [];
  
  for (let s = 0; s < slotCount; s++) {
    const slotNum = s + 1;
    const range = getSlotMutationRange(slotNum, state.isPrime);
    const rangeText = range ? `${range[0]}%-${range[1]}%` : 'N/A';
    const opts = available.map(m => ({ label: m.name, value: m.key, description: m.desc.substring(0, 50), default: state.mutations[s] === m.key }));
    if (opts.length > 25) opts.length = 25;
    rows.push(new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId(`mutation_${s}`).setPlaceholder(`Slot ${slotNum} (${rangeText})`).addOptions(opts)));
  }
  
  const selected = state.mutations.slice(0, slotCount).filter(Boolean).map(m => MUTATION_INFO[m]?.name || m).join('\n') || 'None';
  const embed = new EmbedBuilder().setTitle('🧬 Mutations').setDescription('Pick mutations for each slot').addFields({ name: 'Selected', value: selected }).setColor(0x3498db);
  rows.push(new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('back').setLabel('◀ Back').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('summary').setLabel('📋 Summary').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('cancel').setLabel('Cancel').setStyle(ButtonStyle.Danger)
  ));
  return { embed, components: rows };
}

async function buildSummaryView(userId) {
  const state = buyState.get(userId);
  const dino = DINOS[state.dinoKey];
  const price = await getDinoPrice(state.dinoKey);
  const balance = await getBalance(userId);
  const symbol = await getSetting('currency_symbol') || '🪙';
  const muts = state.mutations.filter(Boolean).map(m => MUTATION_INFO[m]?.name || m).join(', ') || 'None';
  
  const embed = new EmbedBuilder().setTitle('📋 Summary').setDescription('Confirm purchase')
    .addFields(
      { name: 'Species', value: dino.name, inline: true },
      { name: 'Gender', value: state.gender === 'male' ? '♂ Male' : '♀ Female', inline: true },
      { name: 'Growth', value: `${state.growth}%`, inline: true },
      { name: 'Prime', value: state.isPrime ? '✅' : '❌', inline: true },
      { name: 'Mutations', value: muts, inline: false },
      { name: '💰 Cost', value: `${price} ${symbol}`, inline: true },
      { name: 'After', value: `${balance - price} ${symbol}`, inline: true }
    )
    .setColor(0xf39c12);
  const rows = [new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('back').setLabel('◀ Back').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('confirm').setLabel('✅ Buy').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('cancel').setLabel('Cancel').setStyle(ButtonStyle.Danger)
  )];
  return { embed, components: rows };
}
