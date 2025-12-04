'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        // Add cover_photo column to profiles table
        await queryInterface.addColumn('profiles', 'cover_photo', {
            type: Sequelize.TEXT,
            allowNull: true,
            comment: 'Cover photo URL (supports HTTP/HTTPS URLs and data URLs)'
        });
    },

    async down(queryInterface, Sequelize) {
        // Remove cover_photo column
        await queryInterface.removeColumn('profiles', 'cover_photo');
    }
};

