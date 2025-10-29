// ===== Profile Modules - Reusable Components for Profile & Connections Pages =====

/**
 * ProfileCard Component - Reusable card component for profile sections
 */
class ProfileCard {
    constructor(id, title, contentCallback) {
        this.id = id;
        this.title = title;
        this.contentCallback = contentCallback;
        this.element = null;
    }

    render(container) {
        const card = document.createElement('div');
        card.className = 'profile-card';
        card.id = this.id;
        card.innerHTML = `
            <div class="card-header">
                <h2>${this.title}</h2>
            </div>
            <div class="card-content">
                ${this.contentCallback()}
            </div>
        `;

        if (container) {
            container.appendChild(card);
        }

        this.element = card;
        return card;
    }

    updateContent(content) {
        const contentDiv = this.element?.querySelector('.card-content');
        if (contentDiv) {
            contentDiv.innerHTML = content;
        }
    }
}

/**
 * SkillsSection Component - Displays and manages skills
 */
class SkillsSection {
    constructor(containerId) {
        this.containerId = containerId;
        this.skills = [];
    }

    render(skills = []) {
        this.skills = skills;
        const container = document.getElementById(this.containerId);
        if (!container) return;

        if (skills.length === 0) {
            container.innerHTML = `
                <div class="empty-skills">
                    <i class="icon-skills"></i>
                    <p>No skills added yet</p>
                    <button class="btn-link" data-section="skills">Add skills</button>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="skills-grid">
                ${skills.map(skill => this.renderSkillItem(skill)).join('')}
            </div>
        `;
    }

    renderSkillItem(skill) {
        const displayName = this.formatSkillName(skill);
        const skillClass = skill.toLowerCase().replace(/[_\s]/g, '-');

        return `
            <div class="skill-item" data-skill="${skill}">
                <div class="skill-badge">
                    <i class="skill-icon icon-${skillClass}"></i>
                    <span class="skill-name">${displayName}</span>
                </div>
                <div class="skill-endorsements">
                    <span class="endorsement-count">0</span>
                    <span class="endorsement-label">endorsements</span>
                </div>
            </div>
        `;
    }

    formatSkillName(skill) {
        return skill
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    addSkill(skill) {
        if (!this.skills.includes(skill)) {
            this.skills.push(skill);
            this.render(this.skills);
        }
    }

    removeSkill(skill) {
        this.skills = this.skills.filter(s => s !== skill);
        this.render(this.skills);
    }
}

/**
 * AchievementsSection Component - Displays achievements and milestones
 */
class AchievementsSection {
    constructor(containerId) {
        this.containerId = containerId;
        this.achievements = [];
    }

    render(achievements = [], goals = []) {
        this.achievements = achievements;
        const container = document.getElementById(this.containerId);
        if (!container) return;

        // Auto-generate achievements from completed goals
        const generatedAchievements = this.generateAchievementsFromGoals(goals);
        const allAchievements = [...achievements, ...generatedAchievements];

        if (allAchievements.length === 0) {
            container.innerHTML = `
                <div class="empty-achievements">
                    <i class="icon-trophy"></i>
                    <p>No achievements yet. Complete goals to earn achievements!</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="achievements-grid">
                ${allAchievements.map(achievement => this.renderAchievementItem(achievement)).join('')}
            </div>
        `;
    }

    renderAchievementItem(achievement) {
        if (typeof achievement === 'string') {
            achievement = {
                title: achievement,
                description: '',
                date: null,
                icon: 'trophy'
            };
        }

        const dateStr = achievement.date ?
            new Date(achievement.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short' }) :
            '';

        return `
            <div class="achievement-item">
                <div class="achievement-icon">
                    <i class="icon-${achievement.icon || 'trophy'}"></i>
                </div>
                <div class="achievement-content">
                    <h4>${achievement.title}</h4>
                    ${achievement.description ? `<p>${achievement.description}</p>` : ''}
                    ${dateStr ? `<span class="achievement-date">${dateStr}</span>` : ''}
                </div>
            </div>
        `;
    }

    generateAchievementsFromGoals(goals) {
        const achievements = [];
        const completedGoals = goals.filter(g => g.status === 'completed');

        if (completedGoals.length >= 1) {
            achievements.push({
                title: 'Goal Achiever',
                description: 'Completed your first goal',
                icon: 'target',
                date: completedGoals[0].updated_at
            });
        }

        if (completedGoals.length >= 5) {
            achievements.push({
                title: 'Goal Master',
                description: 'Completed 5 goals',
                icon: 'trophy',
                date: completedGoals[4].updated_at
            });
        }

        if (completedGoals.length >= 10) {
            achievements.push({
                title: 'Goal Champion',
                description: 'Completed 10 goals',
                icon: 'trophy',
                date: completedGoals[9].updated_at
            });
        }

        // Check for specific goal types
        const hasWeightLoss = completedGoals.some(g => g.category === 'weight_loss');
        if (hasWeightLoss) {
            achievements.push({
                title: 'Wellness Warrior',
                description: 'Achieved weight loss goals',
                icon: 'trophy'
            });
        }

        return achievements;
    }

    addAchievement(achievement) {
        if (!this.achievements.some(a => a.title === achievement.title)) {
            this.achievements.push(achievement);
            this.render(this.achievements);
        }
    }
}

/**
 * GoalsPreview Component - Shows goals in a compact, LinkedIn-style format
 */
class GoalsPreview {
    constructor(containerId) {
        this.containerId = containerId;
        this.goals = [];
    }

    render(goals = []) {
        this.goals = goals;
        const container = document.getElementById(this.containerId);
        if (!container) return;

        if (goals.length === 0) {
            container.innerHTML = `
                <div class="empty-goals">
                    <i class="icon-target"></i>
                    <p>No goals set yet</p>
                    <a href="goals.html" class="btn-link">Create your first goal</a>
                </div>
            `;
            return;
        }

        const activeGoals = goals.filter(g => g.status === 'active');
        const completedGoals = goals.filter(g => g.status === 'completed');

        container.innerHTML = `
            <div class="goals-summary">
                ${activeGoals.length > 0 ? `
                    <div class="goals-category">
                        <h4>Active Goals</h4>
                        <div class="goals-list-compact">
                            ${activeGoals.slice(0, 3).map(goal => this.renderGoalItem(goal)).join('')}
                        </div>
                        ${activeGoals.length > 3 ? `<a href="goals.html" class="btn-link">View all ${activeGoals.length} goals</a>` : ''}
                    </div>
                ` : ''}
                ${completedGoals.length > 0 ? `
                    <div class="goals-category">
                        <h4>Completed</h4>
                        <div class="goals-list-compact">
                            ${completedGoals.slice(0, 2).map(goal => this.renderGoalItem(goal)).join('')}
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    }

    renderGoalItem(goal) {
        const progress = goal.target_value > 0 ?
            Math.min((goal.current_value / goal.target_value) * 100, 100) : 0;

        return `
            <div class="goal-item-compact">
                <div class="goal-header-compact">
                    <span class="goal-title-compact">${goal.title}</span>
                    <span class="goal-status-badge ${goal.status}">${goal.status}</span>
                </div>
                ${goal.status === 'active' ? `
                    <div class="goal-progress-bar">
                        <div class="goal-progress-fill" style="width: ${progress}%"></div>
                    </div>
                    <div class="goal-progress-text">
                        ${goal.current_value} / ${goal.target_value} ${goal.unit || 'units'}
                    </div>
                ` : ''}
            </div>
        `;
    }
}

/**
 * UserProfileHeader Component - Reusable header for viewing any user's profile
 */
class UserProfileHeader {
    constructor(containerId, isOwnProfile = false) {
        this.containerId = containerId;
        this.isOwnProfile = isOwnProfile;
    }

    render(profileData) {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        const user = profileData.user || {};
        const location = profileData.location || 'Location not set';
        const memberSince = this.formatMemberSince(profileData.created_at);
        const connectionCount = profileData.connection_count || 0;

        const actionButtons = this.isOwnProfile ? `
            <button class="btn-primary" id="editBtn">
                <i class="icon-edit"></i> Edit Profile
            </button>
            <button class="btn-secondary" id="shareBtn">
                <i class="icon-share"></i> Share
            </button>
        ` : `
            <button class="btn-primary" id="connectBtn">
                <i class="icon-add-user"></i> Connect
            </button>
            <button class="btn-secondary" id="messageBtn">
                <i class="icon-message"></i> Message
            </button>
        `;

        container.innerHTML = `
            <div class="profile-avatar-large" id="profileAvatar">
                <span id="avatarInitials">${this.getInitials(user.display_name || 'User')}</span>
                ${user.avatar_url ? `<img src="${user.avatar_url}" alt="${user.display_name}">` : ''}
            </div>
            <div class="profile-header-info">
                <div class="profile-name-section">
                    <h1>${user.display_name || 'User'}</h1>
                    <p class="profile-headline">${this.getHeadline(profileData)}</p>
                    <div class="profile-location">
                        <i class="icon-location"></i>
                        <span>${location}</span>
                    </div>
                    <div class="profile-meta">
                        <span class="profile-stat-item">
                            <strong>${connectionCount}</strong> Connections
                        </span>
                        <span class="profile-stat-item">
                            Member since ${memberSince}
                        </span>
                    </div>
                </div>
                <div class="profile-actions-modern">
                    ${actionButtons}
                </div>
            </div>
        `;
    }

    getInitials(name) {
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }

    getHeadline(profileData) {
        if (profileData.bio && profileData.bio.length > 0) {
            return profileData.bio.substring(0, 100) + (profileData.bio.length > 100 ? '...' : '');
        }

        const skills = profileData.skills || [];
        if (skills.length > 0) {
            return `${skills.length} skill${skills.length > 1 ? 's' : ''} • Wellness Professional`;
        }

        return 'Wellness Enthusiast';
    }

    formatMemberSince(dateString) {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
    }
}

/**
 * ProfileCompletionVisual Component - Circular progress indicator
 */
class ProfileCompletionVisual {
    constructor(containerId) {
        this.containerId = containerId;
        this.circle = null;
    }

    update(percentage) {
        const fillElement = document.getElementById('completionFill');
        const percentageElement = document.getElementById('completionPercentage');

        if (!fillElement || !percentageElement) return;

        const circumference = 2 * Math.PI * 54; // radius = 54
        const offset = circumference - (percentage / 100) * circumference;

        fillElement.style.strokeDashoffset = offset;
        percentageElement.textContent = `${Math.round(percentage)}%`;

        // Update color based on percentage
        if (percentage >= 80) {
            fillElement.style.stroke = '#4caf50'; // Green
        } else if (percentage >= 50) {
            fillElement.style.stroke = '#ff9800'; // Orange
        } else {
            fillElement.style.stroke = '#f44336'; // Red
        }
    }

    updateTips(tips) {
        const tipsElement = document.getElementById('completionTips');
        if (tipsElement) {
            tipsElement.innerHTML = `<p>${tips.join(' • ')}</p>`;
        }
    }
}

// Export components for use in profile.js
window.ProfileModules = {
    ProfileCard,
    SkillsSection,
    AchievementsSection,
    GoalsPreview,
    UserProfileHeader,
    ProfileCompletionVisual
};
