package com.bibliotheca.config;

import com.bibliotheca.model.Book;
import com.bibliotheca.repository.BookRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import java.util.Arrays;
import java.util.List;

@Configuration
public class DataInitializer {

    @Bean
    CommandLineRunner initDatabase(BookRepository repository) {
        return args -> {
            // Seed new databases and repair older rows so every book starts corrupted.
            if (repository.count() == 0) {
                List<Book> books = Arrays.asList(
                    // --- ALL BOOKS ARE CORRUPTED BUT WITH CLEAN DESCRIPTIONS ---
                    new Book("Introduction to Algorithms", "Thomas H. Cormen", "COMPUTER SCIENCE", "9780262033848", 
                        "A comprehensive update of the leading algorithms text, with new material on matchings in bipartite graphs, online algorithms, machine learning, and other topics. Some books on algorithms are rigorous but incomplete; others cover masses of material but lack rigor. Introduction to Algorithms uniquely combines rigor and comprehensiveness. It covers a broad range of algorithms in depth, yet makes their design and analysis accessible to all levels of readers.", 
                        true),
                    new Book("Clean Code", "Robert C. Martin", "SOFTWARE ENGINEERING", "9780132350884", 
                        "Even bad code can function. But if code isn't clean, it can bring a development organization to its knees. Every year, countless hours and significant resources are lost because of poorly written code. But it doesn't have to be that way. Noted software expert Robert C. Martin presents a revolutionary paradigm with Clean Code: A Handbook of Agile Software Craftsmanship.", 
                        true),
                    new Book("Design Patterns", "Erich Gamma", "SOFTWARE ENGINEERING", "9780201633610", 
                        "Capturing a wealth of experience about the design of object-oriented software, four top-notch designers present a catalog of simple and succinct solutions to commonly occurring design problems. Previously undocumented, these 23 patterns allow designers to create more flexible, elegant, and ultimately reusable designs without having to rediscover the design solutions themselves.", 
                        true),
                    new Book("It", "Stephen King", "FICTION", "9780670813025", 
                        "A novel of childhood terror and triumph. Stephen King's terrifying, classic #1 New York Times bestseller is a landmark in American literature. It is the story of seven adults who return to their hometown in order to confront a nightmare they had first stumbled on as teenagers.", 
                        true),
                    new Book("The Da Vinci Code", "Dan Brown", "FICTION", "9780385504201", 
                        "A murder inside the Louvre, and clues in Da Vinci paintings, lead to the discovery of a religious mystery protected by a secret society for two thousand years, which could shake the foundations of Christianity. A mystery thriller novel that combines art, history, and religion.", 
                        true),
                    new Book("Cosmos", "Carl Sagan", "SCIENCE", "9780375508325", 
                        "A personal voyage through space and time. Cosmos traces the origins of knowledge and the scientific method, mixing science and philosophy, and speculates to the future of science. The book also discusses the underlying premises of science by providing biographical anecdotes about many prominent scientists throughout history.", 
                        true),
                    new Book("The Infinite Library", "Jorge Luis Borges", "FICTION", "9780811200127", 
                        "The Library is composed of an indefinite and perhaps infinite number of hexagonal galleries, with vast air shafts between, surrounded by very low railings. From any of the hexagons one can see, interminably, the upper and lower floors. The distribution of the galleries is invariable. Twenty shelves, five long shelves per side, cover all the sides except two.", 
                        true),
                    new Book("The Mythical Man-Month", "Frederick P. Brooks Jr.", "SOFTWARE ENGINEERING", "9780201835953", 
                        "Few books on software project management have been as influential and timeless as The Mythical Man-Month. With a blend of software engineering facts and thought-provoking opinions, Fred Brooks offers insight for anyone managing complex projects. The central theme is that 'adding manpower to a late software project makes it later'.", 
                        true),
                    new Book("The Pragmatic Programmer", "Andrew Hunt", "SOFTWARE ENGINEERING", "9780201616224", 
                        "The Pragmatic Programmer cuts through the increasing specialization and technicalities of modern software development to examine the core process--taking a requirement and producing working, maintainable code that delights its users. It covers topics ranging from personal responsibility and career development to architectural techniques for keeping your code flexible.", 
                        true)
                );

                repository.saveAll(books);
                System.out.println("✅ Database initialized with 9 CORRUPTED books! All require purging.");
            } else {
                List<Book> existingBooks = repository.findAll();
                existingBooks.forEach(book -> book.setCorrupted(true));
                repository.saveAll(existingBooks);
                System.out.println("✅ Existing books normalized: all books are CORRUPTED until user purification.");
            }
        };
    }
}