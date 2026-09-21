package com.bibliotheca.model;

import jakarta.persistence.*;

@Entity
@Table(name = "books")
public class Book {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String title;
    private String author;
    private String category;
    private String isbn;
    
    @Column(length = 5000)
    private String description;
    private boolean isCorrupted; 

    public Book() {}

    public Book(String title, String author, String category, String isbn, String description, boolean isCorrupted) {
        this.title = title;
        this.author = author;
        this.category = category;
        this.isbn = isbn;
        this.description = description;
        this.isCorrupted = isCorrupted;
    }

    // Getters
    public Long getId() { return id; }
    public String getTitle() { return title; }
    public String getAuthor() { return author; }
    public String getCategory() { return category; }
    public String getIsbn() { return isbn; }
    public String getDescription() { return description; }
    public boolean isCorrupted() { return isCorrupted; }

    public void setCorrupted(boolean corrupted) { this.isCorrupted = corrupted; }
}