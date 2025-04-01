const { Client, GatewayIntentBits, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v10');
const { SlashCommandBuilder } = require('@discordjs/builders');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const config = {
    token: 'MTM1NjczNTQ2OTM3NDY3MzE1Nw.Gs_hHa.FrP1Cak79f7DosI5_BNS2NTi1L126_rLf6htYQ',
    clientId: '1356735469374673157',
    guildId: '1330219774499753984', // Voor guild-specifieke commands
    adminRoleId: '1330219774541561957' // Rol ID voor beheerdersrechten
};

// Database simulatie (in een echte bot zou je een echte database gebruiken)
const blacklist = new Map(); // Key: guildId_userId, Value: { reason, timestamp }
const staffBlacklist = new Map(); // Key: guildId_userId, Value: { reason, timestamp }

// Slash commands registreren
const commands = [
    // Blacklist commands
    new SlashCommandBuilder()
        .setName('addtoblacklist')
        .setDescription('Voeg een gebruiker toe aan de blacklist')
        .addStringOption(option =>
            option.setName('userid')
                .setDescription('Discord ID van de gebruiker')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reden')
                .setDescription('Reden voor blacklist')
                .setRequired(true)),
    
    new SlashCommandBuilder()
        .setName('viewblacklist')
        .setDescription('Bekijk de blacklist van deze server'),
    
    new SlashCommandBuilder()
        .setName('removefromblacklist')
        .setDescription('Verwijder een gebruiker van de blacklist')
        .addStringOption(option =>
            option.setName('userid')
                .setDescription('Discord ID van de gebruiker')
                .setRequired(true)),
    
    // Moderation commands
    new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Ban een gebruiker van de server')
        .addStringOption(option =>
            option.setName('userid')
                .setDescription('Discord ID van de gebruiker')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reden')
                .setDescription('Reden voor ban')
                .setRequired(true)),
    
    new SlashCommandBuilder()
        .setName('unban')
        .setDescription('Unban een gebruiker van de server')
        .addStringOption(option =>
            option.setName('userid')
                .setDescription('Discord ID van de gebruiker')
                .setRequired(true)),
    
    new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Kick een gebruiker van de server')
        .addStringOption(option =>
            option.setName('userid')
                .setDescription('Discord ID van de gebruiker')
                .setRequired(true)),
    
    // Staff blacklist commands
    new SlashCommandBuilder()
        .setName('addtostaffblacklist')
        .setDescription('Voeg een gebruiker toe aan de staff blacklist')
        .addStringOption(option =>
            option.setName('userid')
                .setDescription('Discord ID van de gebruiker')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reden')
                .setDescription('Reden voor staff blacklist')
                .setRequired(true)),
    
    new SlashCommandBuilder()
        .setName('viewstaffblacklist')
        .setDescription('Bekijk de staff blacklist'),
    
    new SlashCommandBuilder()
        .setName('removefromstaffblacklist')
        .setDescription('Verwijder een gebruiker van de staff blacklist')
        .addStringOption(option =>
            option.setName('userid')
                .setDescription('Discord ID van de gebruiker')
                .setRequired(true)),
    
    // Role management
    new SlashCommandBuilder()
        .setName('addrole')
        .setDescription('Voeg een rol toe aan een gebruiker')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('Gebruiker')
                .setRequired(true))
        .addRoleOption(option =>
            option.setName('role')
                .setDescription('Rol om toe te voegen')
                .setRequired(true)),
    
    new SlashCommandBuilder()
        .setName('removerole')
        .setDescription('Verwijder een rol van een gebruiker')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('Gebruiker')
                .setRequired(true))
        .addRoleOption(option =>
            option.setName('role')
                .setDescription('Rol om te verwijderen')
                .setRequired(true)),
    
    // Purge messages
    new SlashCommandBuilder()
        .setName('purge')
        .setDescription('Verwijder een aantal berichten')
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('Aantal berichten om te verwijderen (1-100)')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(100))
].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(config.token);

(async () => {
    try {
        console.log('Started refreshing application (/) commands.');
        await rest.put(
            Routes.applicationGuildCommands(config.clientId, config.guildId),
            { body: commands },
        );
        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }
})();

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.on('guildMemberAdd', async member => {
    const key = `${member.guild.id}_${member.id}`;
    if (blacklist.has(key)) {
        try {
            await member.ban({ reason: `Automatisch verbannen - Reden: ${blacklist.get(key).reason}` });
            console.log(`Gebruiker ${member.user.tag} (${member.id}) automatisch verbannen wegens blacklist.`);
        } catch (error) {
            console.error(`Kon gebruiker niet verbannen: ${error}`);
        }
    }
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    const { commandName, options, guild, member } = interaction;

    // Helper functie om admin rechten te checken
    const isAdmin = () => member.roles.cache.has(config.adminRoleId);

    try {
        switch (commandName) {
            case 'addtoblacklist':
                if (!isAdmin()) {
                    return interaction.reply({ content: 'Je hebt geen toestemming om dit commando uit te voeren.', ephemeral: true });
                }
                
                const userIdToBlacklist = options.getString('userid');
                const blacklistReason = options.getString('reden');
                
                const key = `${guild.id}_${userIdToBlacklist}`;
                blacklist.set(key, { reason: blacklistReason, timestamp: Date.now() });
                
                await interaction.reply({ content: `Gebruiker ${userIdToBlacklist} is toegevoegd aan de blacklist. Reden: ${blacklistReason}`, ephemeral: true });
                break;
                
            case 'viewblacklist':
                const blacklistEntries = [];
                for (const [key, value] of blacklist) {
                    if (key.startsWith(guild.id)) {
                        const userId = key.split('_')[1];
                        blacklistEntries.push(`<@${userId}> - Reden: ${value.reason} (${new Date(value.timestamp).toLocaleString()})`);
                    }
                }
                
                const blacklistEmbed = new EmbedBuilder()
                    .setTitle('Blacklist voor deze server')
                    .setDescription(blacklistEntries.length > 0 ? blacklistEntries.join('\n') : 'De blacklist is leeg.')
                    .setColor(0xFF0000);
                
                await interaction.reply({ embeds: [blacklistEmbed] });
                break;
                
            case 'removefromblacklist':
                if (!isAdmin()) {
                    return interaction.reply({ content: 'Je hebt geen toestemming om dit commando uit te voeren.', ephemeral: true });
                }
                
                const userIdToRemove = options.getString('userid');
                const removeKey = `${guild.id}_${userIdToRemove}`;
                
                if (blacklist.has(removeKey)) {
                    blacklist.delete(removeKey);
                    await interaction.reply({ content: `Gebruiker ${userIdToRemove} is verwijderd van de blacklist.`, ephemeral: true });
                } else {
                    await interaction.reply({ content: `Gebruiker ${userIdToRemove} staat niet op de blacklist.`, ephemeral: true });
                }
                break;
                
            case 'ban':
                if (!isAdmin()) {
                    return interaction.reply({ content: 'Je hebt geen toestemming om dit commando uit te voeren.', ephemeral: true });
                }
                
                const userIdToBan = options.getString('userid');
                const banReason = options.getString('reden');
                
                try {
                    await guild.members.ban(userIdToBan, { reason: banReason });
                    await interaction.reply({ content: `Gebruiker ${userIdToBan} is verbannen. Reden: ${banReason}`, ephemeral: true });
                } catch (error) {
                    await interaction.reply({ content: `Kon gebruiker niet verbannen: ${error.message}`, ephemeral: true });
                }
                break;
                
            case 'unban':
                if (!isAdmin()) {
                    return interaction.reply({ content: 'Je hebt geen toestemming om dit commando uit te voeren.', ephemeral: true });
                }
                
                const userIdToUnban = options.getString('userid');
                
                try {
                    await guild.bans.remove(userIdToUnban, 'Unban via commando');
                    await interaction.reply({ content: `Gebruiker ${userIdToUnban} is geunbanned.`, ephemeral: true });
                } catch (error) {
                    await interaction.reply({ content: `Kon gebruiker niet unban: ${error.message}`, ephemeral: true });
                }
                break;
                
            case 'kick':
                if (!isAdmin()) {
                    return interaction.reply({ content: 'Je hebt geen toestemming om dit commando uit te voeren.', ephemeral: true });
                }
                
                const userIdToKick = options.getString('userid');
                
                try {
                    const memberToKick = await guild.members.fetch(userIdToKick);
                    await memberToKick.kick('Kick via commando');
                    await interaction.reply({ content: `Gebruiker ${userIdToKick} is gekicked.`, ephemeral: true });
                } catch (error) {
                    await interaction.reply({ content: `Kon gebruiker niet kicken: ${error.message}`, ephemeral: true });
                }
                break;
                
            case 'addtostaffblacklist':
                if (!isAdmin()) {
                    return interaction.reply({ content: 'Je hebt geen toestemming om dit commando uit te voeren.', ephemeral: true });
                }
                
                const userIdToStaffBlacklist = options.getString('userid');
                const staffBlacklistReason = options.getString('reden');
                
                const staffKey = `${guild.id}_${userIdToStaffBlacklist}`;
                staffBlacklist.set(staffKey, { reason: staffBlacklistReason, timestamp: Date.now() });
                
                await interaction.reply({ content: `Gebruiker ${userIdToStaffBlacklist} is toegevoegd aan de staff blacklist. Reden: ${staffBlacklistReason}`, ephemeral: true });
                break;
                
            case 'viewstaffblacklist':
                const staffBlacklistEntries = [];
                for (const [key, value] of staffBlacklist) {
                    if (key.startsWith(guild.id)) {
                        const userId = key.split('_')[1];
                        staffBlacklistEntries.push(`<@${userId}> - Reden: ${value.reason} (${new Date(value.timestamp).toLocaleString()})`);
                    }
                }
                
                const staffBlacklistEmbed = new EmbedBuilder()
                    .setTitle('Staff Blacklist voor deze server')
                    .setDescription(staffBlacklistEntries.length > 0 ? staffBlacklistEntries.join('\n') : 'De staff blacklist is leeg.')
                    .setColor(0xFFA500);
                
                await interaction.reply({ embeds: [staffBlacklistEmbed] });
                break;
                
            case 'removefromstaffblacklist':
                if (!isAdmin()) {
                    return interaction.reply({ content: 'Je hebt geen toestemming om dit commando uit te voeren.', ephemeral: true });
                }
                
                const userIdToRemoveFromStaff = options.getString('userid');
                const removeStaffKey = `${guild.id}_${userIdToRemoveFromStaff}`;
                
                if (staffBlacklist.has(removeStaffKey)) {
                    staffBlacklist.delete(removeStaffKey);
                    await interaction.reply({ content: `Gebruiker ${userIdToRemoveFromStaff} is verwijderd van de staff blacklist.`, ephemeral: true });
                } else {
                    await interaction.reply({ content: `Gebruiker ${userIdToRemoveFromStaff} staat niet op de staff blacklist.`, ephemeral: true });
                }
                break;
                
            case 'addrole':
                if (!isAdmin()) {
                    return interaction.reply({ content: 'Je hebt geen toestemming om dit commando uit te voeren.', ephemeral: true });
                }
                
                const userToAddRole = options.getUser('user');
                const roleToAdd = options.getRole('role');
                
                try {
                    const memberToAddRole = await guild.members.fetch(userToAddRole.id);
                    await memberToAddRole.roles.add(roleToAdd);
                    await interaction.reply({ content: `Rol ${roleToAdd.name} is toegevoegd aan ${userToAddRole.tag}.`, ephemeral: true });
                } catch (error) {
                    await interaction.reply({ content: `Kon rol niet toevoegen: ${error.message}`, ephemeral: true });
                }
                break;
                
            case 'removerole':
                if (!isAdmin()) {
                    return interaction.reply({ content: 'Je hebt geen toestemming om dit commando uit te voeren.', ephemeral: true });
                }
                
                const userToRemoveRole = options.getUser('user');
                const roleToRemove = options.getRole('role');
                
                try {
                    const memberToRemoveRole = await guild.members.fetch(userToRemoveRole.id);
                    await memberToRemoveRole.roles.remove(roleToRemove);
                    await interaction.reply({ content: `Rol ${roleToRemove.name} is verwijderd van ${userToRemoveRole.tag}.`, ephemeral: true });
                } catch (error) {
                    await interaction.reply({ content: `Kon rol niet verwijderen: ${error.message}`, ephemeral: true });
                }
                break;
                
            case 'purge':
                if (!isAdmin()) {
                    return interaction.reply({ content: 'Je hebt geen toestemming om dit commando uit te voeren.', ephemeral: true });
                }
                
                const amount = options.getInteger('amount');
                
                try {
                    await interaction.channel.bulkDelete(amount, true);
                    await interaction.reply({ content: `${amount} berichten zijn verwijderd.`, ephemeral: true });
                } catch (error) {
                    await interaction.reply({ content: `Kon berichten niet verwijderen: ${error.message}`, ephemeral: true });
                }
                break;
        }
    } catch (error) {
        console.error(error);
        await interaction.reply({ content: 'Er is een fout opgetreden bij het uitvoeren van dit commando.', ephemeral: true });
    }
});

client.login(config.token);