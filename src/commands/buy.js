import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { DINOS } from '../economy/dinos.js';

export const data = new SlashCommandBuilder()
  .setName('buy')
  .setDescription('Buy a dinosaur with coins');

export async function execute(interaction) {
  await interaction.deferReply();
  
  const embed = new EmbedBuilder()
    .setTitle('🦕 Buy Dinosaur')
    .setDescription('Buy flow is working!')
    .setColor(0x2ecc71);
  
  await interaction.editReply({ embeds: [embed] });
}
