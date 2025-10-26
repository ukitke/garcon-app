export class FantasyNameService {
  private adjectives = [
    'Brave', 'Swift', 'Mighty', 'Noble', 'Wise', 'Bold', 'Fierce', 'Gentle', 'Clever', 'Strong',
    'Graceful', 'Daring', 'Radiant', 'Mysterious', 'Valiant', 'Serene', 'Cunning', 'Majestic',
    'Spirited', 'Elegant', 'Fearless', 'Brilliant', 'Charming', 'Adventurous', 'Loyal',
    'Enchanted', 'Golden', 'Silver', 'Crimson', 'Azure', 'Emerald', 'Violet', 'Amber',
    'Celestial', 'Ancient', 'Legendary', 'Mystical', 'Ethereal', 'Divine', 'Cosmic'
  ];

  private nouns = [
    'Dragon', 'Phoenix', 'Griffin', 'Unicorn', 'Wolf', 'Eagle', 'Lion', 'Tiger', 'Bear', 'Fox',
    'Raven', 'Falcon', 'Hawk', 'Owl', 'Panther', 'Leopard', 'Jaguar', 'Lynx', 'Stag', 'Elk',
    'Knight', 'Warrior', 'Mage', 'Archer', 'Paladin', 'Ranger', 'Bard', 'Sage', 'Scholar', 'Monk',
    'Star', 'Moon', 'Sun', 'Comet', 'Nova', 'Galaxy', 'Nebula', 'Cosmos', 'Void', 'Flame',
    'Storm', 'Thunder', 'Lightning', 'Wind', 'Earth', 'Stone', 'Crystal', 'Diamond', 'Ruby', 'Sapphire'
  ];

  generateFantasyName(): string {
    const adjective = this.adjectives[Math.floor(Math.random() * this.adjectives.length)];
    const noun = this.nouns[Math.floor(Math.random() * this.nouns.length)];
    return `${adjective} ${noun}`;
  }

  generateUniqueFantasyName(existingNames: string[]): string {
    let attempts = 0;
    const maxAttempts = 50;
    
    while (attempts < maxAttempts) {
      const name = this.generateFantasyName();
      if (!existingNames.includes(name)) {
        return name;
      }
      attempts++;
    }
    
    // If we can't generate a unique name, add a number suffix
    const baseName = this.generateFantasyName();
    let counter = 1;
    let uniqueName = `${baseName} ${counter}`;
    
    while (existingNames.includes(uniqueName)) {
      counter++;
      uniqueName = `${baseName} ${counter}`;
    }
    
    return uniqueName;
  }

  validateFantasyName(name: string): boolean {
    // Check if name is reasonable length and contains only letters, spaces, and numbers
    const nameRegex = /^[a-zA-Z0-9\s]{1,50}$/;
    return nameRegex.test(name.trim());
  }
}

export const fantasyNameService = new FantasyNameService();