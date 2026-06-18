package config

import (
	"fmt"
	"log"
	"os"

	"github.com/joho/godotenv"
	migrate "github.com/rubenv/sql-migrate"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

var DB *gorm.DB

func InitDB() {
	if err := godotenv.Load(); err != nil {
		fmt.Println("No .env file found, reading from environment")
	}
	dsn := fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
		os.Getenv("DB_HOST"),
		os.Getenv("DB_PORT"),
		os.Getenv("DB_USER"),
		os.Getenv("DB_PASSWORD"),
		os.Getenv("DB_NAME"),
		os.Getenv("SSL_MODE"),
	)
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatalf("Unable to connect to database: %s", err)
	}
	fmt.Println("Connected to database")
	DB = db

	sqlDB, err := DB.DB()
	if err != nil {
		log.Fatalf("Failed to get raw db connection: %s", err)
	}
	migrations := &migrate.FileMigrationSource{Dir: "./migrations"}
	n, err := migrate.Exec(sqlDB, "postgres", migrations, migrate.Up)
	if err != nil {
		log.Fatalf("Migration failed: %s", err)
	}
	fmt.Printf("Applied %d migrations\n", n)
}
