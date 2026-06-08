class Security {
  static isAuthorized(interaction) {
    const member = interaction.member;
    if (!member) return false;
    if (member.permissions.has('Administrator')) return true;
    const config = interaction.client.config;
    if (!config.authorizedRoles || config.authorizedRoles.length === 0) return false;
    const roleIds = member.roles.cache.map((r) => r.id);
    return config.authorizedRoles.some((id) => roleIds.includes(id));
  }

  static async ensureAuthorized(interaction) {
    if (!this.isAuthorized(interaction)) {
      await interaction.reply({
        embeds: [
          {
            title: '❌ Access Denied',
            description: 'You do not have permission to use this command.',
            color: 0xff0000,
          },
        ],
        ephemeral: true,
      });
      return false;
    }
    return true;
  }
}

module.exports = Security;
