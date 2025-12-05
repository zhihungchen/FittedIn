'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        // Add image_url column to posts table
        await queryInterface.addColumn('posts', 'image_url', {
            type: Sequelize.TEXT,
            allowNull: true,
            comment: 'Post image URL (supports HTTP/HTTPS URLs and data URLs)'
        });
    },

    async down(queryInterface, Sequelize) {
        // Remove image_url column
        await queryInterface.removeColumn('posts', 'image_url');
    }
};

