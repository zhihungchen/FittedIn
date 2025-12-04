'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        // Change avatar_url from STRING(500) to TEXT to support base64 data URLs
        await queryInterface.changeColumn('users', 'avatar_url', {
            type: Sequelize.TEXT,
            allowNull: true
        });
    },

    async down(queryInterface, Sequelize) {
        // Revert back to STRING(500)
        await queryInterface.changeColumn('users', 'avatar_url', {
            type: Sequelize.STRING(500),
            allowNull: true
        });
    }
};

