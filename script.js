// Fetch books from the Open Library API
function fetchBooks() {
    fetch('https://openlibrary.org/subjects/fiction.json?limit=50') // Fetch more books to ensure enough results
        .then(response => response.json())
        .then(async (data) => {
            // Filter books with short titles and authors
            let books = await Promise.all(data.works.map(async (book, index) => {
                const detailedData = await fetchBookDetailsFromAPI(book.cover_edition_key);

                return {
                    id: book.cover_edition_key || `OL${index}M`,
                    title: book.title.length <= 20 ? book.title : null, // Keep short titles
                    author: book.authors && book.authors.length > 0 
                        ? book.authors[0].name 
                        : "Unknown",
                    editorial: detailedData.publisher || "No Editorial Info",
                    pages: detailedData.pages || "Not Available",
                };
            }));

            // Filter out books without titles and adjust dynamically for at least 10
            books = books.filter(book => book.title !== null);

            if (books.length < 10) {
                // Dynamically adjust to include longer titles if fewer than 10 valid books
                books = data.works.slice(0, 10).map((book, index) => ({
                    id: book.cover_edition_key || `OL${index}M`,
                    title: book.title,
                    author: book.authors && book.authors.length > 0 
                        ? book.authors[0].name 
                        : "Unknown",
                    editorial: "No Editorial Info",
                    pages: "Not Available",
                }));
            }

            localStorage.setItem("books", JSON.stringify(books.slice(0, 10))); // Ensure exactly 10 books
            displayBooks();
        })
        .catch(error => console.error('Error fetching books:', error));
}

// Fetch detailed book data using the book ID
async function fetchBookDetailsFromAPI(bookId) {
    if (!bookId) return {};
    try {
        const response = await fetch(`https://openlibrary.org/api/books?bibkeys=OLID:${bookId}&format=json&jscmd=data`);
        const data = await response.json();
        const bookKey = `OLID:${bookId}`;
        const book = data[bookKey];
        return {
            publisher: book?.publishers?.[0]?.name || null,
            pages: book?.number_of_pages || null,
        };
    } catch (error) {
        console.error(`Error fetching details for book ${bookId}:`, error);
        return {};
    }
}

// Display books on the homepage
function displayBooks() {
    const books = JSON.parse(localStorage.getItem("books")) || [];
    const itemList = document.getElementById("item-list");
    itemList.innerHTML = ""; // Clear the list
    books.forEach(book => {
        const listItem = document.createElement("li");

        // Book Details Link
        const link = document.createElement("a");
        link.href = `item.html?id=${book.id}`;
        link.textContent = `${book.title} by ${book.author}`;
        listItem.appendChild(link);

        // Create button container
        const buttonContainer = document.createElement("div");
        buttonContainer.classList.add("button-container");

        // Edit Button
        const editButton = document.createElement("button");
        editButton.textContent = "Edit";
        editButton.classList.add("edit-button");
        editButton.onclick = () => {
            window.location.href = `edit.html?id=${book.id}`;
        };
        buttonContainer.appendChild(editButton);

        // Delete Button
        const deleteButton = document.createElement("button");
        deleteButton.textContent = "Delete";
        deleteButton.classList.add("delete-button");
        deleteButton.onclick = () => {
            deleteBook(book.id);
        };
        buttonContainer.appendChild(deleteButton);

        listItem.appendChild(buttonContainer);
        itemList.appendChild(listItem);
    });
}

// Fetch and pre-fill book details for editing
function fetchAndPrefillBookDetails() {
    const params = new URLSearchParams(window.location.search);
    const bookId = params.get("id");
    const books = JSON.parse(localStorage.getItem("books")) || [];

    const book = books.find(b => b.id === bookId);
    if (book) {
        document.getElementById("title").value = book.title;
        document.getElementById("author").value = book.author;
        document.getElementById("editorial").value = book.editorial;
        document.getElementById("pages").value = book.pages;
    } else {
        alert("Book not found!");
        window.location.href = "index.html"; // Redirect back if book is missing
    }
}

// Save changes made to the book
document.getElementById("edit-form")?.addEventListener("submit", function (event) {
    event.preventDefault(); // Prevent page refresh
    const params = new URLSearchParams(window.location.search);
    const bookId = params.get("id");
    const books = JSON.parse(localStorage.getItem("books")) || [];

    const updatedBooks = books.map(book => {
        if (book.id === bookId) {
            return {
                ...book,
                title: document.getElementById("title").value,
                author: document.getElementById("author").value,
                editorial: document.getElementById("editorial").value,
                pages: document.getElementById("pages").value,
            };
        }
        return book;
    });

    localStorage.setItem("books", JSON.stringify(updatedBooks));
    alert("Book details updated!");
    window.location.href = "index.html"; // Redirect back to the homepage
});

// Fetch book details for the details page
function fetchBookDetails() {
    const params = new URLSearchParams(window.location.search);
    const bookId = params.get("id");
    const books = JSON.parse(localStorage.getItem("books")) || [];

    const book = books.find(b => b.id === bookId);
    const detailsContainer = document.getElementById("item-details");
    if (book) {
        detailsContainer.innerHTML = `
            <h2>${book.title}</h2>
            <p><strong>Author:</strong> ${book.author}</p>
            <p><strong>Editorial:</strong> ${book.editorial}</p>
            <p><strong>Pages:</strong> ${book.pages}</p>
        `;
    } else if (books.length === 0) {
        detailsContainer.innerHTML = `<p>No book data available. Please reload the app.</p>`;
    } else {
        detailsContainer.innerHTML = `<p>Book not found!</p>`;
    }
}

// Delete book functionality
function deleteBook(bookId) {
    const books = JSON.parse(localStorage.getItem("books"));
    const updatedBooks = books.filter(book => book.id !== bookId);
    localStorage.setItem("books", JSON.stringify(updatedBooks));
    displayBooks();
}

// Initialize the app
document.addEventListener("DOMContentLoaded", function () {
    if (document.getElementById("item-list")) {
        fetchBooks();
    } else if (document.getElementById("edit-form")) {
        fetchAndPrefillBookDetails();
    } else if (document.getElementById("item-details")) {
        fetchBookDetails();
    }
});
