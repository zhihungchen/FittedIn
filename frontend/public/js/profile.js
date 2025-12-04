// ===== Profile Page JavaScript - Using Modular Components =====

class ProfileManager {
    constructor() {
        this.currentProfile = null;
        this.currentTab = 'overview';
        this.isEditing = false;
        this.currentEditSection = null;
        this.viewingUserId = null; // ID of the user being viewed (null = viewing own profile)
        this.isViewingOtherUser = false; // Flag to indicate if viewing another user's profile

        // Initialize modular components
        this.skillsSection = null;
        this.achievementsSection = null;
        this.goalsPreview = null;
        this.profileHeader = null;
        this.completionVisual = null;

        this.init();
    }

    async init() {
        // Check authentication
        if (!this.checkAuth()) {
            return;
        }

        // Check if viewing another user's profile from URL parameter
        const urlParams = new URLSearchParams(window.location.search);
        const userIdParam = urlParams.get('userId');
        if (userIdParam) {
            this.viewingUserId = parseInt(userIdParam);
            this.isViewingOtherUser = true;
            const currentUserId = parseInt(authState.getUserId());
            // If viewing own profile via userId param, treat as own profile
            if (this.viewingUserId === currentUserId) {
                this.viewingUserId = null;
                this.isViewingOtherUser = false;
            }
        }

        // Initialize modular components
        this.initializeComponents();

        // Set a timeout to ensure content shows even if API hangs
        const loadingTimeout = setTimeout(() => {
            console.warn('Loading timeout - showing content anyway');
            this.showLoading(false);
        }, 5000); // 5 second timeout

        try {
            // Load profile data
            await this.loadProfile();
        } finally {
            clearTimeout(loadingTimeout);
        }

        // Setup event listeners
        this.setupEventListeners();

        // Initialize UI
        this.initializeUI();
    }

    initializeComponents() {
        // Initialize modular components (with error handling)
        try {
            if (window.ProfileModules) {
                this.skillsSection = new window.ProfileModules.SkillsSection('displaySkills');
                this.achievementsSection = new window.ProfileModules.AchievementsSection('displayAchievements');
                this.goalsPreview = new window.ProfileModules.GoalsPreview('displayGoals');
                this.profileHeader = new window.ProfileModules.UserProfileHeader('profileHeaderContainer', true);
                this.completionVisual = new window.ProfileModules.ProfileCompletionVisual('completionCircle');
            } else {
                console.warn('ProfileModules not loaded yet, will retry after modules load');
            }
        } catch (error) {
            console.error('Error initializing components:', error);
            // Continue without modules - they're optional enhancements
        }
    }

    checkAuth() {
        return authState.isAuthenticated();
    }

    async loadProfile() {
        try {
            this.showLoading(true);

            let response;
            if (this.isViewingOtherUser && this.viewingUserId) {
                // Load another user's public profile
                console.log('Loading other user profile:', this.viewingUserId);
                response = await api.profiles.getUserProfile(this.viewingUserId);
            } else {
                // Load own profile
                response = await api.profiles.getMyProfile();
            }

            // Debug: log the response structure
            console.log('Profile API Response:', response);

            // Handle both possible response structures
            this.currentProfile = response.data ? response.data.profile : response.profile;

            if (!this.currentProfile) {
                console.warn('Profile data not found, creating fallback');
                // Create a minimal profile structure
                const userId = authState.getUserId();
                this.currentProfile = {
                    user: {
                        email: authState.getUserId() || 'user@example.com',
                        display_name: 'User'
                    },
                    location: '',
                    bio: '',
                    pronouns: '',
                    date_of_birth: '',
                    fitness_level: '',
                    height: null,
                    weight: null,
                    skills: [],
                    primary_goals: [],
                    created_at: new Date().toISOString()
                };
            }

            try {
                await this.updateProfileDisplay();
                this.calculateCompletionScore();
                // Hide edit buttons if viewing another user's profile
                if (this.isViewingOtherUser) {
                    this.hideEditButtons();
                }
            } catch (displayError) {
                console.error('Error updating display:', displayError);
            }
        } catch (error) {
            console.error('Failed to load profile:', error);

            // Handle different error types
            const errorMessage = error.message || 'Unknown error';

            // Only clear storage and redirect if it's actually an auth error
            if (errorMessage.includes('token') || errorMessage.includes('unauthorized') || errorMessage.includes('401')) {
                console.log('Authentication error detected, logging out');
                this.showError('Authentication failed. Please log in again.');
                setTimeout(() => {
                    if (window.logout) window.logout();
                }, 3000);
            } else if (errorMessage.includes('not found') || errorMessage.includes('404')) {
                // For "not found" errors, show a less alarming message and create fallback
                console.log('Profile not found, creating fallback profile');
                const targetUserId = this.isViewingOtherUser ? this.viewingUserId : authState.getUserId();

                if (targetUserId) {
                    // Try to get user info from API to create a better fallback
                    try {
                        const userResponse = await api.users.getProfile(targetUserId);
                        const user = userResponse.data?.user || userResponse.user;
                        this.currentProfile = {
                            user: {
                                id: user?.id || targetUserId,
                                email: user?.email || 'user@example.com',
                                display_name: user?.display_name || 'User',
                                avatar_url: user?.avatar_url || null
                            },
                            location: '',
                            bio: '',
                            pronouns: '',
                            date_of_birth: '',
                            fitness_level: '',
                            height: null,
                            weight: null,
                            skills: [],
                            primary_goals: [],
                            created_at: new Date().toISOString()
                        };
                        await this.updateProfileDisplay();
                        this.calculateCompletionScore();
                        // Don't show error for fallback profile
                        return;
                    } catch (userError) {
                        console.error('Failed to get user info:', userError);
                    }
                }

                // If we can't get user info, show a friendly message
                this.showError('Profile information is not available yet.');
            } else {
                // For other errors, show the error but try to continue
                this.showError(`Failed to load profile: ${errorMessage}`);

                // Create fallback profile if we have a user ID
                const userId = this.isViewingOtherUser ? this.viewingUserId : authState.getUserId();
                if (userId) {
                    this.currentProfile = {
                        user: {
                            id: userId,
                            email: 'user@example.com',
                            display_name: 'User'
                        },
                        location: '',
                        bio: '',
                        pronouns: '',
                        date_of_birth: '',
                        fitness_level: '',
                        height: null,
                        weight: null,
                        skills: [],
                        primary_goals: [],
                        created_at: new Date().toISOString()
                    };
                    try {
                        await this.updateProfileDisplay();
                        this.calculateCompletionScore();
                    } catch (displayError) {
                        console.error('Error updating fallback display:', displayError);
                    }
                }
            }
        } finally {
            // ALWAYS hide loading state when done, whether successful or not
            console.log('[loadProfile] Finally block: hiding loading state');

            // Multiple attempts to ensure loading is hidden
            setTimeout(() => {
                console.log('[loadProfile] Timeout: forcing loading state to hide');
                this.showLoading(false);

                // Also directly manipulate DOM as backup
                const loadingState = document.getElementById('loadingState');
                const profileContent = document.getElementById('profileContent');
                if (loadingState) {
                    loadingState.classList.add('hidden');
                    loadingState.style.display = 'none';
                }
                if (profileContent) {
                    profileContent.classList.remove('hidden');
                    profileContent.style.display = 'block';
                }
            }, 100);

            // Immediate hide
            this.showLoading(false);
        }
    }

    async updateProfileDisplay() {
        if (!this.currentProfile) {
            console.warn('No profile data to display');
            return;
        }

        try {
            const profile = this.currentProfile;
            const user = profile.user || {};

            // Update header elements directly (with null checks)
            this.updateElement('profileName', user.display_name || 'User');
            this.updateElement('profileHeadline', this.getHeadline(profile));
            this.updateElement('profileLocation', profile.location || 'Location not set');
            this.updateElement('memberSince', this.formatMemberSince(profile.created_at));
            this.updateElement('contactEmail', user.email || 'user@example.com');
            this.updateElement('contactLocation', profile.location || 'Location not set');

            // Update cover photo
            try {
                this.updateCoverPhoto(profile.cover_photo);
            } catch (coverError) {
                console.error('Error updating cover photo:', coverError);
            }

            // Update avatar
            try {
                this.updateAvatar(user.display_name || 'User', user.avatar_url);
            } catch (avatarError) {
                console.error('Error updating avatar:', avatarError);
            }

            // Update bio
            const bioElement = document.getElementById('profileBio');
            if (bioElement) {
                bioElement.textContent = profile.bio || 'No bio available. Add a bio to tell others about your wellness journey.';
            }

            // Update skills using module (with fallback)
            try {
                if (this.skillsSection) {
                    this.skillsSection.render(profile.skills || []);
                } else if (window.ProfileModules) {
                    // Try to initialize if modules are now available
                    this.skillsSection = new window.ProfileModules.SkillsSection('displaySkills');
                    this.skillsSection.render(profile.skills || []);
                }
            } catch (skillsError) {
                console.error('Error rendering skills:', skillsError);
                // Fallback rendering
                const skillsContainer = document.getElementById('displaySkills');
                if (skillsContainer) {
                    const skills = profile.skills || [];
                    if (skills.length === 0) {
                        skillsContainer.innerHTML = '<div class="empty-skills"><i class="icon-skills"></i><p>No skills added yet</p></div>';
                    } else {
                        skillsContainer.innerHTML = skills.map(skill =>
                            `<div class="skill-item"><div class="skill-badge"><span class="skill-name">${skill}</span></div></div>`
                        ).join('');
                    }
                }
            }

            // Load goals for achievements and goals preview
            // Only load own goals, not other users' goals
            let goals = [];
            if (!this.isViewingOtherUser) {
                try {
                    const goalsResponse = await api.goals.getAll();
                    goals = goalsResponse.data?.goals || goalsResponse.goals || [];
                } catch (error) {
                    console.warn('Could not load goals for achievements:', error);
                }
            }

            // Update achievements using module (with fallback)
            try {
                if (this.achievementsSection) {
                    this.achievementsSection.render([], goals);
                } else if (window.ProfileModules) {
                    this.achievementsSection = new window.ProfileModules.AchievementsSection('displayAchievements');
                    this.achievementsSection.render([], goals);
                }
            } catch (achError) {
                console.error('Error rendering achievements:', achError);
            }

            // Update goals preview using module (with fallback)
            try {
                if (this.goalsPreview) {
                    this.goalsPreview.render(goals);
                } else if (window.ProfileModules) {
                    this.goalsPreview = new window.ProfileModules.GoalsPreview('displayGoals');
                    this.goalsPreview.render(goals);
                }
            } catch (goalsError) {
                console.error('Error rendering goals:', goalsError);
            }

            // Update activity stats
            try {
                this.updateActivityStats(goals);
            } catch (statError) {
                console.error('Error updating activity stats:', statError);
            }

            // Update sidebar info
            try {
                this.updateSidebarInfo(profile);
            } catch (sidebarError) {
                console.error('Error updating sidebar:', sidebarError);
            }

            // Load connection count
            try {
                await this.loadConnectionCount();
            } catch (connError) {
                console.warn('Could not load connection count:', connError);
            }

            // Update settings (optional, might not exist)
            try {
                this.updateSettings(profile);
            } catch (settingsError) {
                // Settings might not be needed in new design
                console.warn('Settings update skipped:', settingsError);
            }
        } catch (error) {
            console.error('Error in updateProfileDisplay:', error);
            throw error; // Re-throw to be caught by caller
        }
    }

    getHeadline(profile) {
        if (profile.bio && profile.bio.length > 0) {
            return profile.bio.substring(0, 100) + (profile.bio.length > 100 ? '...' : '');
        }

        const skills = profile.skills || [];
        if (skills.length > 0) {
            return `${skills.length} skill${skills.length > 1 ? 's' : ''} • Wellness Professional`;
        }

        return 'Wellness Enthusiast';
    }

    updateActivityStats(goals) {
        const completedGoals = goals.filter(g => g.status === 'completed');
        const activeDays = this.calculateActiveDays(goals);

        this.updateElement('goalsCompletedValue', completedGoals.length);
        this.updateElement('activeDaysValue', activeDays);
        this.updateElement('achievementsValue', completedGoals.length >= 1 ? completedGoals.length : 0);
    }

    calculateActiveDays(goals) {
        // Simple calculation - could be enhanced with actual activity logs
        const uniqueDates = new Set();
        goals.forEach(goal => {
            if (goal.created_at) {
                uniqueDates.add(new Date(goal.created_at).toDateString());
            }
            if (goal.updated_at) {
                uniqueDates.add(new Date(goal.updated_at).toDateString());
            }
        });
        return uniqueDates.size;
    }

    updateSidebarInfo(profile) {
        this.updateElement('sidebarFitnessLevel', profile.fitness_level ?
            this.capitalizeFirst(profile.fitness_level) : '-');
        this.updateElement('sidebarHeight', profile.height ?
            `${profile.height} cm` : '-');
        this.updateElement('sidebarWeight', profile.weight ?
            `${profile.weight} kg` : '-');

        const bmi = this.calculateBMI(profile.height, profile.weight);
        this.updateElement('sidebarBMI', bmi ? bmi.toFixed(1) : '-');

        // Update pronouns
        const pronounsElement = document.getElementById('contactPronouns');
        const pronounsText = document.getElementById('contactPronounsText');
        if (pronounsElement && pronounsText) {
            if (profile.pronouns) {
                pronounsElement.style.display = 'flex';
                pronounsText.textContent = profile.pronouns;
            } else {
                pronounsElement.style.display = 'none';
            }
        }
    }

    updateAvatar(name, avatarUrl) {
        const avatarElement = document.getElementById('profileAvatar');
        const initialsElement = document.getElementById('avatarInitials');

        if (!avatarElement) {
            console.warn('Avatar element not found');
            return;
        }

        // Remove any existing image first
        const existingImg = avatarElement.querySelector('img');
        if (existingImg) {
            existingImg.remove();
        }

        if (avatarUrl && typeof avatarUrl === 'string' && avatarUrl.trim()) {
            // Hide initials
            if (initialsElement) {
                initialsElement.style.display = 'none';
            }

            // Create and add image
            const img = document.createElement('img');
            img.src = avatarUrl.trim();
            img.alt = name || 'User avatar';
            img.style.width = '100%';
            img.style.height = '100%';
            img.style.objectFit = 'cover';
            img.style.borderRadius = '50%';

            // Handle image load errors
            img.onerror = (error) => {
                console.error('Failed to load avatar image:', error);
                // Fallback to initials if image fails to load
                img.remove();
                if (initialsElement) {
                    initialsElement.style.display = 'flex';
                    const initials = (name || 'User').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
                    initialsElement.textContent = initials;
                }
            };

            // Handle successful image load
            img.onload = () => {
                console.log('Avatar image loaded successfully');
            };

            avatarElement.appendChild(img);
        } else {
            // Show initials when no avatar URL
            if (initialsElement) {
                initialsElement.style.display = 'flex';
                const initials = (name || 'User').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
                initialsElement.textContent = initials;
            }
        }
    }

    // Removed updateOverviewTab, updateSkillsDisplay, updateGoalsDisplay
    // Now handled by modular components in updateProfileDisplay()

    updateSettings(profile) {
        const privacySettings = profile.privacy_settings || {};

        this.updateElement('profileVisibility', privacySettings.profile_visibility || 'public');
        this.updateElement('showActivity', privacySettings.show_activity !== false);
        this.updateElement('showGoals', privacySettings.show_goals !== false);
        this.updateElement('showConnections', privacySettings.show_connections !== false);
    }

    calculateCompletionScore() {
        if (!this.currentProfile) return 0;

        const profile = this.currentProfile;
        let score = 0;
        const maxScore = 100;

        // Basic info (40 points)
        if (profile.location) score += 10;
        if (profile.bio && profile.bio.length > 50) score += 15;
        if (profile.pronouns) score += 5;
        if (profile.date_of_birth) score += 10;

        // Physical info (20 points)
        if (profile.height) score += 5;
        if (profile.weight) score += 5;
        if (profile.fitness_level) score += 10;

        // Goals (20 points)
        const primaryGoals = profile.primary_goals || [];
        if (primaryGoals.length > 0) score += 20;

        // Skills (20 points)
        const skills = profile.skills || [];
        if (skills.length > 0) score += 20;

        const percentage = Math.min(score, maxScore);

        // Update circular completion visual
        if (this.completionVisual) {
            this.completionVisual.update(percentage);
            const tips = this.getCompletionTips(percentage);
            this.completionVisual.updateTips(tips);
        } else {
            // Fallback to old method - use correct element ID
            this.updateElement('completionPercentage', `${percentage}%`);
            const fillElement = document.getElementById('completionFill');
            if (fillElement) {
                // Calculate stroke-dashoffset for circular progress
                const circumference = 2 * Math.PI * 54; // radius is 54
                const offset = circumference - (percentage / 100) * circumference;
                fillElement.style.strokeDashoffset = offset;
            }
            this.updateCompletionTips(percentage);
        }

        return percentage;
    }

    getCompletionTips(percentage) {
        const tips = [];
        const profile = this.currentProfile;

        if (!profile.location) {
            tips.push('Add your location to connect with nearby members');
        }
        if (!profile.bio || profile.bio.length < 50) {
            tips.push('Write a bio (50+ characters) to introduce yourself');
        }
        if (!profile.fitness_level) {
            tips.push('Set your fitness level to personalize your experience');
        }
        if (!profile.height || !profile.weight) {
            tips.push('Add your height and weight to track your BMI');
        }
        if (!profile.skills || profile.skills.length === 0) {
            tips.push('Add wellness skills to showcase your expertise');
        }
        if (!profile.primary_goals || profile.primary_goals.length === 0) {
            tips.push('Set primary goals to start your wellness journey');
        }

        if (percentage >= 100 || tips.length === 0) {
            tips.push('Congratulations! Your profile is complete.');
        } else if (tips.length > 3) {
            tips.splice(0, tips.length);
            tips.push('Complete key sections: location, bio, fitness level, and goals');
        }

        return tips;
    }

    updateCompletionTips(percentage) {
        const tipsElement = document.getElementById('completionTips');
        const profile = this.currentProfile;
        let tips = [];

        // Give specific recommendations based on what's missing
        if (!profile.location) {
            tips.push('Add your location to connect with nearby members');
        }
        if (!profile.bio || profile.bio.length < 50) {
            tips.push('Write a bio (50+ characters) to introduce yourself');
        }
        if (!profile.fitness_level) {
            tips.push('Set your fitness level to personalize your experience');
        }
        if (!profile.height || !profile.weight) {
            tips.push('Add your height and weight to track your BMI');
        }
        if (!profile.skills || profile.skills.length === 0) {
            tips.push('Add wellness skills to showcase your expertise');
        }
        if (!profile.primary_goals || profile.primary_goals.length === 0) {
            tips.push('Set primary goals to start your wellness journey');
        }
        if (!profile.pronouns && percentage > 0) {
            tips.push('Add your pronouns for better inclusivity');
        }

        // If everything is complete
        if (percentage >= 100 || tips.length === 0) {
            tips = ['Congratulations! Your profile is complete. Start connecting with others!'];
        } else if (tips.length > 3) {
            // If too many tips, just show a general message
            tips = ['Complete key sections: location, bio, fitness level, and goals'];
        }

        tipsElement.innerHTML = `<p>${tips.join(' • ')}</p>`;
    }

    calculateBMI(height, weight) {
        if (!height || !weight) return null;

        const heightInMeters = height / 100;
        return weight / (heightInMeters * heightInMeters);
    }

    async loadConnectionCount() {
        try {
            // For now, only show connection count for own profile
            // For other users, we'd need a different API endpoint
            if (this.isViewingOtherUser) {
                // Don't show connection count for other users (or show placeholder)
                this.updateElement('connectionCount', '-');
                return;
            }

            const response = await api.connections.getConnections('accepted');
            const connections = response.data?.connections || response.connections || [];
            this.updateElement('connectionCount', connections.length);
        } catch (error) {
            console.warn('Failed to load connection count:', error);
            this.updateElement('connectionCount', '0');
        }
    }

    formatMemberSince(dateString) {
        if (!dateString) return '-';

        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 30) {
            return `${diffDays} days`;
        } else if (diffDays < 365) {
            const months = Math.floor(diffDays / 30);
            return `${months} month${months > 1 ? 's' : ''}`;
        } else {
            const years = Math.floor(diffDays / 365);
            return `${years} year${years > 1 ? 's' : ''}`;
        }
    }

    capitalizeFirst(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    updateElement(id, value) {
        if (!id) return;
        const element = document.getElementById(id);
        if (element) {
            try {
                if (typeof value === 'boolean') {
                    element.checked = value;
                } else {
                    element.textContent = value;
                }
            } catch (error) {
                console.warn(`Error updating element ${id}:`, error);
            }
        } else {
            console.warn(`Element with id "${id}" not found`);
        }
    }

    setupEventListeners() {
        // Logout link
        const logoutLink = document.getElementById('logoutLink');
        if (logoutLink) {
            logoutLink.addEventListener('click', (e) => {
                e.preventDefault();
                window.logout();
            });
        }

        // Edit Profile button
        const editBtn = document.getElementById('editBtn');
        if (editBtn) {
            editBtn.addEventListener('click', () => {
                // Open edit modal with basic section
                this.editSection('basic');
            });
        }

        // Share Profile button
        const shareBtn = document.getElementById('shareBtn');
        if (shareBtn) {
            shareBtn.addEventListener('click', () => this.shareProfile());
        }

        // Tab switching (removed - no tabs in new design)
        // Tab functionality removed in LinkedIn-style redesign

        // Section edit buttons (inline edit buttons)
        document.querySelectorAll('.btn-edit-inline').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const section = e.currentTarget.dataset.section;
                if (section) {
                    this.editSection(section);
                }
            });
        });

        // Link buttons for adding content
        document.querySelectorAll('.btn-link[data-section]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const section = e.currentTarget.dataset.section;
                if (section) {
                    this.editSection(section);
                }
            });
        });

        // Add Goal buttons
        const addGoalBtn = document.getElementById('addGoalBtn');
        const addFirstGoalBtn = document.getElementById('addFirstGoalBtn');
        if (addGoalBtn) {
            addGoalBtn.addEventListener('click', () => this.addNewGoal());
        }
        if (addFirstGoalBtn) {
            addFirstGoalBtn.addEventListener('click', () => this.addNewGoal());
        }

        // Delete Account button
        const deleteAccountBtn = document.getElementById('deleteAccountBtn');
        if (deleteAccountBtn) {
            deleteAccountBtn.addEventListener('click', () => this.deleteAccount());
        }

        // Modal close buttons
        const closeEditModalBtn = document.getElementById('closeEditModalBtn');
        const cancelEditModalBtn = document.getElementById('cancelEditModalBtn');
        if (closeEditModalBtn) {
            closeEditModalBtn.addEventListener('click', () => this.closeEditModal());
        }
        if (cancelEditModalBtn) {
            cancelEditModalBtn.addEventListener('click', () => this.closeEditModal());
        }

        const closeAvatarModalBtn = document.getElementById('closeAvatarModalBtn');
        const cancelAvatarModalBtn = document.getElementById('cancelAvatarModalBtn');
        if (closeAvatarModalBtn) {
            closeAvatarModalBtn.addEventListener('click', () => this.closeAvatarModal());
        }
        if (cancelAvatarModalBtn) {
            cancelAvatarModalBtn.addEventListener('click', () => this.closeAvatarModal());
        }

        // Cover photo modal close buttons
        const closeCoverPhotoModalBtn = document.getElementById('closeCoverPhotoModalBtn');
        const cancelCoverPhotoModalBtn = document.getElementById('cancelCoverPhotoModalBtn');
        if (closeCoverPhotoModalBtn) {
            closeCoverPhotoModalBtn.addEventListener('click', () => this.closeCoverPhotoModal());
        }
        if (cancelCoverPhotoModalBtn) {
            cancelCoverPhotoModalBtn.addEventListener('click', () => this.closeCoverPhotoModal());
        }

        // Save buttons
        const saveProfileChangesBtn = document.getElementById('saveProfileChangesBtn');
        if (saveProfileChangesBtn) {
            saveProfileChangesBtn.addEventListener('click', () => this.saveProfileChanges());
        }

        const uploadAvatarBtn = document.getElementById('uploadAvatarBtn');
        if (uploadAvatarBtn) {
            uploadAvatarBtn.addEventListener('click', () => this.uploadAvatar());
        }

        // Cover photo upload
        const uploadCoverPhotoBtn = document.getElementById('uploadCoverPhotoBtn');
        if (uploadCoverPhotoBtn) {
            uploadCoverPhotoBtn.addEventListener('click', () => this.uploadCoverPhoto());
        }

        // Form submission
        const profileForm = document.getElementById('profileForm');
        if (profileForm) {
            profileForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveProfileChanges();
            });
        }

        // Avatar upload
        const avatarInput = document.getElementById('avatarInput');
        if (avatarInput) {
            avatarInput.addEventListener('change', (e) => {
                this.handleAvatarPreview(e);
            });
        }

        // Cover photo upload
        const coverPhotoInput = document.getElementById('coverPhotoInput');
        if (coverPhotoInput) {
            coverPhotoInput.addEventListener('change', (e) => {
                this.handleCoverPhotoPreview(e);
            });
        }

        // Choose file button in cover photo upload modal
        const chooseCoverPhotoFileBtn = document.getElementById('chooseCoverPhotoFileBtn');
        if (chooseCoverPhotoFileBtn) {
            chooseCoverPhotoFileBtn.addEventListener('click', (e) => {
                e.preventDefault();
                document.getElementById('coverPhotoInput').click();
            });
        }

        // Open avatar upload modal
        const openAvatarUploadBtn = document.getElementById('openAvatarUploadBtn');
        if (openAvatarUploadBtn) {
            openAvatarUploadBtn.addEventListener('click', () => this.openAvatarUpload());
        }

        // Choose file button in avatar upload modal
        const chooseAvatarFileBtn = document.getElementById('chooseAvatarFileBtn');
        if (chooseAvatarFileBtn) {
            chooseAvatarFileBtn.addEventListener('click', (e) => {
                e.preventDefault();
                document.getElementById('avatarInput').click();
            });
        }

        // Edit cover photo button
        const editCoverBtn = document.getElementById('editCoverBtn');
        if (editCoverBtn) {
            editCoverBtn.addEventListener('click', () => this.openCoverPhotoUpload());
        }
    }

    initializeUI() {
        // Initialize completion score (no tabs in new design)
        this.calculateCompletionScore();

        // Hide edit buttons if viewing another user's profile
        if (this.isViewingOtherUser) {
            this.hideEditButtons();
        }

        // Close modal when clicking outside
        const editModal = document.getElementById('editModal');
        const avatarModal = document.getElementById('avatarModal');

        if (editModal) {
            editModal.addEventListener('click', (e) => {
                if (e.target === editModal) {
                    this.closeEditModal();
                }
            });
        }

        if (avatarModal) {
            avatarModal.addEventListener('click', (e) => {
                if (e.target === avatarModal) {
                    this.closeAvatarModal();
                }
            });
        }

        // Close cover photo modal when clicking outside
        const coverPhotoModal = document.getElementById('coverPhotoModal');
        if (coverPhotoModal) {
            coverPhotoModal.addEventListener('click', (e) => {
                if (e.target === coverPhotoModal) {
                    this.closeCoverPhotoModal();
                }
            });
        }
    }

    hideEditButtons() {
        // Hide edit profile button
        const editBtn = document.getElementById('editBtn');
        if (editBtn) {
            editBtn.style.display = 'none';
        }

        // Hide all inline edit buttons
        document.querySelectorAll('.btn-edit-inline').forEach(btn => {
            btn.style.display = 'none';
        });

        // Hide avatar upload button
        const openAvatarUploadBtn = document.getElementById('openAvatarUploadBtn');
        if (openAvatarUploadBtn) {
            openAvatarUploadBtn.style.display = 'none';
        }

        // Hide cover photo edit button
        const editCoverBtn = document.getElementById('editCoverBtn');
        if (editCoverBtn) {
            editCoverBtn.style.display = 'none';
        }

        // Hide "Add skills" and similar action buttons
        document.querySelectorAll('.btn-link[data-section]').forEach(btn => {
            btn.style.display = 'none';
        });
    }

    // ===== Tab Management =====
    // Tab functionality removed in LinkedIn-style redesign
    // All content is now displayed in a single scrollable view

    // ===== Edit Mode =====
    toggleEditMode() {
        this.isEditing = !this.isEditing;

        const editBtn = document.getElementById('editBtn');
        if (editBtn) {
            editBtn.innerHTML = this.isEditing ?
                '<i class="icon-close"></i> Cancel Edit' :
                '<i class="icon-edit"></i> Edit Profile';
        }

        // Toggle edit buttons visibility
        document.querySelectorAll('.btn-edit-section').forEach(btn => {
            btn.style.display = this.isEditing ? 'block' : 'none';
        });
    }

    editSection(section) {
        this.currentEditSection = section;
        this.openEditModal(section);
    }

    openEditModal(section) {
        const modal = document.getElementById('editModal');
        const modalTitle = document.getElementById('modalTitle');
        const form = document.getElementById('profileForm');

        modalTitle.textContent = `Edit ${this.capitalizeFirst(section)} Information`;

        // Generate form content based on section
        form.innerHTML = this.generateFormContent(section);

        // Populate form with current data
        this.populateForm(section);

        modal.style.display = 'block';
    }

    generateFormContent(section) {
        const forms = {
            about: `
                <div class="form-group">
                    <label for="bio">About</label>
                    <textarea id="bio" name="bio" rows="6" placeholder="Tell others about your wellness journey, goals, and what motivates you..."></textarea>
                    <small style="color: rgba(0,0,0,0.6); display: block; margin-top: 4px;">Write a compelling bio to help others get to know you better.</small>
                </div>
            `,
            basic: `
                <div class="form-group">
                    <label for="pronouns">Pronouns</label>
                    <input type="text" id="pronouns" name="pronouns" placeholder="e.g., they/them, she/her, he/him">
                </div>
                <div class="form-group">
                    <label for="location">Location</label>
                    <input type="text" id="location" name="location" placeholder="City, Country">
                </div>
                <div class="form-group">
                    <label for="date_of_birth">Date of Birth</label>
                    <input type="date" id="date_of_birth" name="date_of_birth">
                </div>
                <div class="form-group">
                    <label for="bio">Professional Summary</label>
                    <textarea id="bio" name="bio" rows="4" placeholder="Write a compelling summary of your wellness journey..."></textarea>
                </div>
            `,
            physical: `
                <div class="form-group">
                    <label for="height">Height (cm)</label>
                    <input type="number" id="height" name="height" min="50" max="300" placeholder="170">
                </div>
                <div class="form-group">
                    <label for="weight">Weight (kg)</label>
                    <input type="number" id="weight" name="weight" min="10" max="500" step="0.1" placeholder="70.5">
                </div>
                <div class="form-group">
                    <label for="fitness_level">Fitness Level</label>
                    <select id="fitness_level" name="fitness_level">
                        <option value="">Select fitness level</option>
                        <option value="beginner">Beginner</option>
                        <option value="intermediate">Intermediate</option>
                        <option value="advanced">Advanced</option>
                    </select>
                </div>
            `,
            skills: `
                <div class="form-group">
                    <label>Wellness Skills (select all that apply)</label>
                    <div class="checkbox-group">
                        ${this.generateSkillCheckboxes()}
                    </div>
                </div>
            `,
            goals: `
                <div class="form-group">
                    <label>Primary Goals (select all that apply)</label>
                    <div class="checkbox-group">
                        ${this.generateGoalCheckboxes()}
                    </div>
                </div>
            `,
            achievements: `
                <div class="form-group">
                    <p style="color: rgba(0,0,0,0.6); margin-bottom: 1rem;">
                        Achievements are automatically generated when you complete goals! Keep working towards your goals to earn achievements.
                    </p>
                    <div style="padding: 1rem; background: #fff9e6; border-radius: 8px; border-left: 4px solid #ffc107;">
                        <strong>Current Achievements:</strong>
                        <ul style="margin-top: 0.5rem; padding-left: 1.5rem;">
                            <li>Complete your first goal to earn "Goal Achiever"</li>
                            <li>Complete 5 goals to earn "Goal Master"</li>
                            <li>Complete 10 goals to earn "Goal Champion"</li>
                        </ul>
                    </div>
                </div>
            `
        };

        return forms[section] || '';
    }

    generateSkillCheckboxes() {
        const skills = [
            'nutrition', 'fitness', 'yoga', 'running', 'weightlifting',
            'swimming', 'cycling', 'mental_health', 'meditation', 'pilates'
        ];

        return skills.map(skill => `
            <div class="checkbox-item">
                <input type="checkbox" id="skill_${skill}" value="${skill}">
                <label for="skill_${skill}">${this.capitalizeFirst(skill.replace('_', ' '))}</label>
            </div>
        `).join('');
    }

    generateGoalCheckboxes() {
        const goals = [
            'weight_loss', 'muscle_gain', 'cardio', 'flexibility',
            'nutrition', 'mental_health', 'strength', 'endurance'
        ];

        return goals.map(goal => `
            <div class="checkbox-item">
                <input type="checkbox" id="goal_${goal}" value="${goal}">
                <label for="goal_${goal}">${this.capitalizeFirst(goal.replace('_', ' '))}</label>
            </div>
        `).join('');
    }

    populateForm(section) {
        if (!this.currentProfile) return;

        const profile = this.currentProfile;

        switch (section) {
            case 'about':
                this.setFormValue('bio', profile.bio || '');
                break;
            case 'basic':
                this.setFormValue('pronouns', profile.pronouns || '');
                this.setFormValue('location', profile.location || '');
                this.setFormValue('date_of_birth', profile.date_of_birth || '');
                this.setFormValue('bio', profile.bio || '');
                break;
            case 'physical':
                this.setFormValue('height', profile.height || '');
                this.setFormValue('weight', profile.weight || '');
                this.setFormValue('fitness_level', profile.fitness_level || '');
                break;
            case 'skills':
                this.setCheckboxes('skill_', profile.skills || []);
                break;
            case 'goals':
                this.setCheckboxes('goal_', profile.primary_goals || []);
                break;
        }
    }

    setFormValue(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.value = value;
        }
    }

    setCheckboxes(prefix, values) {
        document.querySelectorAll(`input[id^="${prefix}"]`).forEach(checkbox => {
            checkbox.checked = values.includes(checkbox.value);
        });
    }

    async saveProfileChanges() {
        try {
            const formData = new FormData(document.getElementById('profileForm'));
            const data = {};

            // Validate and collect form data
            const validationErrors = this.validateFormData(this.currentEditSection);
            if (validationErrors.length > 0) {
                this.showError(validationErrors.join(' '));
                return;
            }

            // Collect form data with proper type conversion
            for (let [key, value] of formData.entries()) {
                // Skip empty strings for optional fields
                if (value === '' || value === null) {
                    continue;
                }

                // Convert numeric fields to proper types
                if (key === 'height') {
                    data[key] = parseInt(value, 10);
                } else if (key === 'weight') {
                    data[key] = parseFloat(value);
                } else {
                    data[key] = value;
                }
            }

            // Collect checkboxes
            if (this.currentEditSection === 'skills') {
                data.skills = Array.from(document.querySelectorAll('input[id^="skill_"]:checked'))
                    .map(cb => cb.value);
            } else if (this.currentEditSection === 'goals') {
                data.primary_goals = Array.from(document.querySelectorAll('input[id^="goal_"]:checked'))
                    .map(cb => cb.value);
            } else if (this.currentEditSection === 'about') {
                // About section only updates bio
                const bio = formData.get('bio');
                if (bio) {
                    data.bio = bio;
                }
            }

            // Disable save button and show loading
            const saveBtn = document.getElementById('saveProfileChangesBtn');
            if (saveBtn) {
                saveBtn.disabled = true;
                saveBtn.textContent = 'Saving...';
            }

            // Update profile
            const response = await api.profiles.updateMyProfile(data);
            // Handle both possible response structures
            this.currentProfile = response.data ? response.data.profile : response.profile;

            // Update display
            await this.updateProfileDisplay();
            this.calculateCompletionScore();

            // Close modal
            this.closeEditModal();

            this.showSuccess('Profile updated successfully!');
        } catch (error) {
            console.error('Failed to update profile:', error);

            // Show validation errors if available
            let errorMessage = error.message;
            if (error.validationErrors && Array.isArray(error.validationErrors)) {
                const validationMessages = error.validationErrors.map(err => {
                    // Format express-validator error messages
                    const field = err.param || err.path || 'field';
                    const msg = err.msg || err.message || 'Invalid value';
                    return `${field}: ${msg}`;
                });
                errorMessage = `Validation failed:\n${validationMessages.join('\n')}`;
            }

            this.showError(`Failed to update profile: ${errorMessage}`);
        } finally {
            // Re-enable save button
            const saveBtn = document.getElementById('saveProfileChangesBtn');
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.textContent = 'Save Changes';
            }
        }
    }

    validateFormData(section) {
        const errors = [];

        switch (section) {
            case 'physical':
                const height = document.getElementById('height')?.value;
                const weight = document.getElementById('weight')?.value;

                if (height) {
                    const h = parseInt(height);
                    if (h < 50 || h > 300) {
                        errors.push('Height must be between 50-300 cm.');
                    }
                }

                if (weight) {
                    const w = parseFloat(weight);
                    if (w < 10 || w > 500) {
                        errors.push('Weight must be between 10-500 kg.');
                    }
                }
                break;

            case 'about':
            case 'basic':
                const bio = document.getElementById('bio')?.value;
                if (bio && bio.length > 1000) {
                    errors.push('Bio must be less than 1000 characters.');
                }
                break;
        }

        return errors;
    }

    closeEditModal() {
        document.getElementById('editModal').style.display = 'none';
    }

    // ===== Avatar Management =====
    openAvatarUpload() {
        document.getElementById('avatarModal').style.display = 'block';
    }

    closeAvatarModal() {
        document.getElementById('avatarModal').style.display = 'none';
        // Reset preview
        const preview = document.getElementById('uploadPreview');
        if (preview) {
            preview.innerHTML = `
                <div class="upload-placeholder">
                    <i class="icon-camera"></i>
                    <p>Click to upload avatar</p>
                </div>
            `;
        }
        const avatarInput = document.getElementById('avatarInput');
        if (avatarInput) {
            avatarInput.value = '';
        }
    }

    handleAvatarPreview(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const preview = document.getElementById('uploadPreview');
            preview.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
        };
        reader.readAsDataURL(file);
    }

    async uploadAvatar() {
        const fileInput = document.getElementById('avatarInput');
        const file = fileInput.files[0];

        if (!file) {
            this.showError('Please select a file to upload');
            return;
        }

        // Validate file type
        if (!file.type.startsWith('image/')) {
            this.showError('Please select an image file');
            return;
        }

        // Validate file size (max 5MB)
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSize) {
            this.showError('File size must be less than 5MB');
            return;
        }

        try {
            // Disable upload button and show loading
            const uploadBtn = document.getElementById('uploadAvatarBtn');
            if (uploadBtn) {
                uploadBtn.disabled = true;
                uploadBtn.textContent = 'Uploading...';
            }

            // Convert file to base64 data URL
            const dataUrl = await this.fileToDataURL(file);

            if (!dataUrl || !dataUrl.startsWith('data:image/')) {
                throw new Error('Failed to convert file to image data URL');
            }

            // Resize image if it's too large (optional optimization)
            let optimizedDataUrl;
            try {
                optimizedDataUrl = await this.resizeImageIfNeeded(dataUrl, 512, 512);
            } catch (resizeError) {
                console.warn('Image resize failed, using original:', resizeError);
                // Use original if resize fails
                optimizedDataUrl = dataUrl;
            }

            // Validate optimized data URL
            if (!optimizedDataUrl || !optimizedDataUrl.startsWith('data:image/')) {
                throw new Error('Invalid image data after optimization');
            }

            // Get current user ID
            const userId = authState.getUserId();
            if (!userId) {
                throw new Error('User not authenticated');
            }

            // Update user profile with avatar URL
            const response = await api.users.updateProfile(parseInt(userId), {
                avatarUrl: optimizedDataUrl
            });

            // Get updated user data from response
            const user = response.user || response.data?.user;
            const avatarUrl = user?.avatarUrl || optimizedDataUrl;
            const displayName = user?.displayName || this.currentProfile?.user?.display_name || 'User';

            // Update current profile data
            if (this.currentProfile && this.currentProfile.user) {
                this.currentProfile.user.avatar_url = avatarUrl;
            }

            // Refresh avatar display immediately
            console.log('Updating avatar display with URL length:', avatarUrl ? avatarUrl.length : 0);
            this.updateAvatar(displayName, avatarUrl);

            // Reload profile to ensure everything is in sync
            try {
                await this.loadProfile();
            } catch (reloadError) {
                console.warn('Failed to reload profile after avatar update:', reloadError);
                // Continue anyway, we've already updated the display
            }

            this.showSuccess('Avatar updated successfully!');
            this.closeAvatarModal();
        } catch (error) {
            console.error('Failed to upload avatar:', error);
            let errorMessage = 'Failed to upload avatar. Please try again.';

            // Provide more specific error messages
            if (error.message) {
                if (error.message.includes('Validation failed')) {
                    errorMessage = 'Invalid image format. Please select a valid image file.';
                } else if (error.message.includes('401') || error.message.includes('unauthorized')) {
                    errorMessage = 'Session expired. Please log in again.';
                } else if (error.message.includes('403')) {
                    errorMessage = 'Permission denied. You can only update your own avatar.';
                } else if (error.message.includes('timeout')) {
                    errorMessage = 'Upload timeout. Please try again with a smaller image.';
                } else {
                    errorMessage = error.message;
                }
            }

            // Show validation errors if available
            if (error.validationErrors && Array.isArray(error.validationErrors)) {
                const validationMessages = error.validationErrors.map(err => {
                    const field = err.param || err.path || 'field';
                    const msg = err.msg || err.message || 'Invalid value';
                    return `${field}: ${msg}`;
                });
                errorMessage = `Validation failed: ${validationMessages.join(', ')}`;
            }

            this.showError(errorMessage);
        } finally {
            // Re-enable upload button
            const uploadBtn = document.getElementById('uploadAvatarBtn');
            if (uploadBtn) {
                uploadBtn.disabled = false;
                uploadBtn.textContent = 'Update Photo';
            }
        }
    }

    // Helper function to convert file to data URL
    fileToDataURL(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(new Error('Failed to read file'));
            reader.readAsDataURL(file);
        });
    }

    // Helper function to resize image if needed
    resizeImageIfNeeded(dataUrl, maxWidth, maxHeight) {
        return new Promise((resolve, reject) => {
            if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) {
                reject(new Error('Invalid image data URL'));
                return;
            }

            const img = new Image();

            // Set timeout to prevent hanging if image never loads
            const timeout = setTimeout(() => {
                reject(new Error('Image loading timeout'));
            }, 10000); // 10 second timeout

            img.onload = () => {
                clearTimeout(timeout);
                try {
                    // If image is smaller than max dimensions, return original
                    if (img.width <= maxWidth && img.height <= maxHeight) {
                        resolve(dataUrl);
                        return;
                    }

                    // Calculate new dimensions while maintaining aspect ratio
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > maxWidth) {
                            height = Math.round((height * maxWidth) / width);
                            width = maxWidth;
                        }
                    } else {
                        if (height > maxHeight) {
                            width = Math.round((width * maxHeight) / height);
                            height = maxHeight;
                        }
                    }

                    // Ensure dimensions are valid
                    if (width <= 0 || height <= 0 || !isFinite(width) || !isFinite(height)) {
                        console.warn('Invalid dimensions calculated, using original');
                        resolve(dataUrl);
                        return;
                    }

                    // Resize image
                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');

                    // Use high-quality image rendering
                    ctx.imageSmoothingEnabled = true;
                    ctx.imageSmoothingQuality = 'high';
                    ctx.drawImage(img, 0, 0, width, height);

                    // Convert to data URL with compression (JPEG quality 0.8)
                    const resizedDataUrl = canvas.toDataURL('image/jpeg', 0.8);

                    // Validate the result
                    if (!resizedDataUrl || resizedDataUrl.length < 100) {
                        console.warn('Resized image seems too small, using original');
                        resolve(dataUrl);
                        return;
                    }

                    resolve(resizedDataUrl);
                } catch (error) {
                    console.error('Error during image resize:', error);
                    // If resize fails, return original
                    resolve(dataUrl);
                }
            };

            img.onerror = (error) => {
                clearTimeout(timeout);
                console.error('Image loading error:', error);
                reject(new Error('Failed to load image for resizing'));
            };

            img.src = dataUrl;
        });
    }

    // ===== Cover Photo Management =====
    openCoverPhotoUpload() {
        document.getElementById('coverPhotoModal').style.display = 'block';
    }

    closeCoverPhotoModal() {
        document.getElementById('coverPhotoModal').style.display = 'none';
        // Reset preview
        const preview = document.getElementById('coverPhotoPreview');
        if (preview) {
            preview.innerHTML = `
                <div class="upload-placeholder">
                    <i class="icon-camera"></i>
                    <p>Click to upload cover photo</p>
                </div>
            `;
        }
        const coverPhotoInput = document.getElementById('coverPhotoInput');
        if (coverPhotoInput) {
            coverPhotoInput.value = '';
        }
    }

    handleCoverPhotoPreview(event) {
        const file = event.target.files[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            this.showError('Please select an image file');
            event.target.value = ''; // Clear the input
            return;
        }

        // Validate file size (max 10MB)
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (file.size > maxSize) {
            this.showError('File size must be less than 10MB');
            event.target.value = ''; // Clear the input
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const preview = document.getElementById('coverPhotoPreview');
            if (preview) {
                preview.innerHTML = `
                    <img src="${e.target.result}" 
                         alt="Cover Photo Preview" 
                         style="max-width: 100%; 
                                max-height: 400px; 
                                width: 100%;
                                object-fit: cover; 
                                border-radius: 8px;
                                display: block;">
                `;
            }
        };
        reader.onerror = () => {
            this.showError('Failed to preview image');
        };
        reader.readAsDataURL(file);
    }

    async uploadCoverPhoto() {
        const fileInput = document.getElementById('coverPhotoInput');
        const file = fileInput.files[0];

        if (!file) {
            this.showError('Please select a file to upload');
            return;
        }

        // Validate file type
        if (!file.type.startsWith('image/')) {
            this.showError('Please select an image file');
            return;
        }

        // Validate file size (max 10MB for cover photos, they can be larger)
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (file.size > maxSize) {
            this.showError('File size must be less than 10MB');
            return;
        }

        try {
            // Disable upload button and show loading
            const uploadBtn = document.getElementById('uploadCoverPhotoBtn');
            if (uploadBtn) {
                uploadBtn.disabled = true;
                uploadBtn.textContent = 'Uploading...';
            }

            // Convert file to base64 data URL
            const dataUrl = await this.fileToDataURL(file);

            if (!dataUrl || !dataUrl.startsWith('data:image/')) {
                throw new Error('Failed to convert file to image data URL');
            }

            // Resize image for cover photo (recommended size: 1200x300 or similar)
            // Cover photos are wider, so we use larger dimensions
            let optimizedDataUrl;
            try {
                optimizedDataUrl = await this.resizeImageIfNeeded(dataUrl, 1200, 600);
            } catch (resizeError) {
                console.warn('Cover photo resize failed, using original:', resizeError);
                optimizedDataUrl = dataUrl;
            }

            // Validate optimized data URL
            if (!optimizedDataUrl || !optimizedDataUrl.startsWith('data:image/')) {
                throw new Error('Invalid image data after optimization');
            }

            // Update profile with cover photo URL
            const response = await api.profiles.updateMyProfile({
                cover_photo: optimizedDataUrl
            });

            // Get updated profile data from response
            const profile = response.profile || response.data?.profile;
            const coverPhotoUrl = profile?.cover_photo || optimizedDataUrl;

            // Update current profile data
            if (this.currentProfile) {
                this.currentProfile.cover_photo = coverPhotoUrl;
            }

            // Update cover photo display immediately
            console.log('Updating cover photo display with URL length:', coverPhotoUrl ? coverPhotoUrl.length : 0);
            this.updateCoverPhoto(coverPhotoUrl);

            // Reload profile to ensure everything is in sync
            try {
                await this.loadProfile();
            } catch (reloadError) {
                console.warn('Failed to reload profile after cover photo update:', reloadError);
                // Continue anyway, we've already updated the display
            }

            this.showSuccess('Cover photo updated successfully!');
            this.closeCoverPhotoModal();
        } catch (error) {
            console.error('Failed to upload cover photo:', error);
            let errorMessage = 'Failed to upload cover photo. Please try again.';

            // Provide more specific error messages
            if (error.message) {
                if (error.message.includes('Validation failed')) {
                    errorMessage = 'Invalid image format. Please select a valid image file.';
                } else if (error.message.includes('401') || error.message.includes('unauthorized')) {
                    errorMessage = 'Session expired. Please log in again.';
                } else if (error.message.includes('403')) {
                    errorMessage = 'Permission denied. You can only update your own cover photo.';
                } else if (error.message.includes('timeout')) {
                    errorMessage = 'Upload timeout. Please try again with a smaller image.';
                } else {
                    errorMessage = error.message;
                }
            }

            // Show validation errors if available
            if (error.validationErrors && Array.isArray(error.validationErrors)) {
                const validationMessages = error.validationErrors.map(err => {
                    const field = err.param || err.path || 'field';
                    const msg = err.msg || err.message || 'Invalid value';
                    return `${field}: ${msg}`;
                });
                errorMessage = `Validation failed: ${validationMessages.join(', ')}`;
            }

            this.showError(errorMessage);
        } finally {
            // Re-enable upload button
            const uploadBtn = document.getElementById('uploadCoverPhotoBtn');
            if (uploadBtn) {
                uploadBtn.disabled = false;
                uploadBtn.textContent = 'Update Cover Photo';
            }
        }
    }

    // Update cover photo display
    updateCoverPhoto(coverPhotoUrl) {
        const coverPhotoElement = document.getElementById('coverPhoto');

        if (!coverPhotoElement) {
            console.warn('Cover photo element not found');
            return;
        }

        if (coverPhotoUrl && typeof coverPhotoUrl === 'string' && coverPhotoUrl.trim()) {
            // Set background image
            coverPhotoElement.style.backgroundImage = `url(${coverPhotoUrl.trim()})`;
            coverPhotoElement.style.backgroundSize = 'cover';
            coverPhotoElement.style.backgroundPosition = 'center';
            coverPhotoElement.style.backgroundRepeat = 'no-repeat';
        } else {
            // Remove background image if no cover photo
            coverPhotoElement.style.backgroundImage = 'none';
            // You might want to set a default background color here
            coverPhotoElement.style.backgroundColor = '#e0e0e0';
        }
    }

    // ===== Utility Functions =====
    showLoading(show) {
        console.log('[showLoading] called with:', show);

        const loadingState = document.getElementById('loadingState');
        const profileContent = document.getElementById('profileContent');

        console.log('[showLoading] Elements found:', {
            loadingState: !!loadingState,
            profileContent: !!profileContent
        });

        if (!loadingState) {
            console.error('[showLoading] loadingState element not found!');
        }

        if (!profileContent) {
            console.error('[showLoading] profileContent element not found!');
        }

        if (!loadingState || !profileContent) {
            console.error('[showLoading] Missing required elements, cannot update loading state');
            return;
        }

        try {
            if (show) {
                loadingState.classList.remove('hidden');
                profileContent.classList.add('hidden');
                console.log('[showLoading] Showing loading state');
            } else {
                loadingState.classList.add('hidden');
                profileContent.classList.remove('hidden');
                console.log('[showLoading] Hiding loading state, showing profile content');
            }
        } catch (error) {
            console.error('[showLoading] Error updating loading state:', error);
            // Force hide by directly setting display style
            try {
                if (!show && loadingState) {
                    loadingState.style.display = 'none';
                }
                if (!show && profileContent) {
                    profileContent.style.display = 'block';
                }
            } catch (forceError) {
                console.error('[showLoading] Failed to force update:', forceError);
            }
        }
    }

    showError(message) {
        const errorAlert = document.getElementById('errorAlert');
        errorAlert.textContent = message;
        errorAlert.classList.remove('hidden');

        setTimeout(() => {
            errorAlert.classList.add('hidden');
        }, 5000);
    }

    showSuccess(message) {
        const successAlert = document.getElementById('successAlert');
        successAlert.textContent = message;
        successAlert.classList.remove('hidden');

        setTimeout(() => {
            successAlert.classList.add('hidden');
        }, 3000);
    }

    // Logout handled by global window.logout function

    // ===== Public Methods for HTML onclick handlers =====
    addNewGoal() {
        // This would open a goal creation modal
        this.showSuccess('Goal creation feature coming soon!');
    }

    shareProfile() {
        // This would implement profile sharing
        if (navigator.share) {
            navigator.share({
                title: 'My FittedIn Profile',
                text: 'Check out my wellness profile on FittedIn!',
                url: window.location.href
            });
        } else {
            // Fallback: copy to clipboard
            navigator.clipboard.writeText(window.location.href);
            this.showSuccess('Profile link copied to clipboard!');
        }
    }

    deleteAccount() {
        if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
            // This would implement account deletion
            this.showError('Account deletion feature coming soon!');
        }
    }
}

// ===== Global Functions for HTML onclick handlers =====
let profileManager;

// Logout handled by global window.logout function from auth.js

// window.switchTab removed - tabs no longer used in LinkedIn-style design

window.toggleEditMode = function () {
    console.log('toggleEditMode called');
    if (profileManager) {
        profileManager.toggleEditMode();
    } else {
        console.error('ProfileManager not initialized');
    }
};

window.editSection = function (section) {
    if (profileManager) {
        profileManager.editSection(section);
    } else {
        console.error('ProfileManager not initialized');
    }
};

window.closeEditModal = function () {
    if (profileManager) {
        profileManager.closeEditModal();
    } else {
        const modal = document.getElementById('editModal');
        if (modal) modal.style.display = 'none';
    }
};

window.saveProfileChanges = function () {
    if (profileManager) {
        profileManager.saveProfileChanges();
    } else {
        console.error('ProfileManager not initialized');
    }
};

window.openAvatarUpload = function () {
    if (profileManager) {
        profileManager.openAvatarUpload();
    } else {
        const modal = document.getElementById('avatarModal');
        if (modal) modal.style.display = 'block';
    }
};

window.closeAvatarModal = function () {
    if (profileManager) {
        profileManager.closeAvatarModal();
    } else {
        const modal = document.getElementById('avatarModal');
        if (modal) modal.style.display = 'none';
    }
};

window.uploadAvatar = function () {
    if (profileManager) {
        profileManager.uploadAvatar();
    } else {
        console.error('ProfileManager not initialized');
    }
};

window.addNewGoal = function () {
    if (profileManager) {
        profileManager.addNewGoal();
    } else {
        alert('ProfileManager not initialized');
    }
};

window.shareProfile = function () {
    if (profileManager) {
        profileManager.shareProfile();
    } else {
        if (navigator.share) {
            navigator.share({
                title: 'My FittedIn Profile',
                text: 'Check out my wellness profile on FittedIn!',
                url: window.location.href
            });
        } else {
            navigator.clipboard.writeText(window.location.href);
            alert('Profile link copied to clipboard!');
        }
    }
};

window.deleteAccount = function () {
    if (profileManager) {
        profileManager.deleteAccount();
    } else {
        if (confirm('Are you sure you want to delete your account?')) {
            alert('Account deletion feature coming soon!');
        }
    }
};

// ===== Initialize Profile Manager =====
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing ProfileManager...');
    try {
        profileManager = new ProfileManager();
        console.log('ProfileManager initialized successfully');
    } catch (error) {
        console.error('Error initializing ProfileManager:', error);
        // Ensure content is shown even if initialization fails
        const loadingState = document.getElementById('loadingState');
        const profileContent = document.getElementById('profileContent');
        if (loadingState) loadingState.classList.add('hidden');
        if (profileContent) profileContent.classList.remove('hidden');
    }
});
