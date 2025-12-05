const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Post = sequelize.define('Post', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        },
        onDelete: 'CASCADE'
    },
    content: {
        type: DataTypes.TEXT,
        allowNull: false,
        validate: {
            len: [1, 5000]
        }
    },
    image_url: {
        type: DataTypes.TEXT,
        allowNull: true,
        validate: {
            isUrl(value) {
                // Allow null, undefined, or empty string
                if (value != null && value !== '') {
                    // Accept both HTTP/HTTPS URLs and data URLs (base64 encoded images)
                    const isHttpUrl = /^https?:\/\/.+/.test(value);
                    const isDataUrl = /^data:image\/.+;base64,.+/.test(value);
                    if (!isHttpUrl && !isDataUrl) {
                        throw new Error('Image URL must be a valid HTTP/HTTPS URL or data URL');
                    }
                }
            }
        }
    }
}, {
    tableName: 'posts',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        {
            fields: ['user_id']
        },
        {
            fields: ['created_at']
        }
    ]
});

// Instance methods
Post.prototype.toJSON = function () {
    const values = Object.assign({}, this.get());
    return values;
};

// Define associations
Post.associate = function (models) {
    // Post belongs to User
    Post.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user'
    });

    // Post has many PostLikes
    Post.hasMany(models.PostLike, {
        foreignKey: 'post_id',
        as: 'likes'
    });

    // Post has many PostComments
    Post.hasMany(models.PostComment, {
        foreignKey: 'post_id',
        as: 'comments'
    });
};

module.exports = Post;

