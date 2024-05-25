document.addEventListener('DOMContentLoaded', function() {
    // Use buttons to toggle between views
    document.querySelector('#inbox').addEventListener('click', () => load_mailbox('inbox'));
    document.querySelector('#sent').addEventListener('click', () => load_mailbox('sent'));
    document.querySelector('#archived').addEventListener('click', () => load_mailbox('archive'));
    document.querySelector('#compose').addEventListener('click', () => compose_email());
    document.querySelector('#compose-form').addEventListener('submit', send_email);

    // Add search functionality
    document.querySelector('#search-form').addEventListener('submit', search_emails);

    // By default, load the inbox
    load_mailbox('inbox');
});

function compose_email() {
    // Show compose view and hide other views
    document.querySelector('#emails-view').style.display = 'none';
    document.querySelector('#compose-view').style.display = 'block';

    // Clear out composition fields
    document.querySelector('#compose-recipients').value = '';
    document.querySelector('#compose-subject').value = '';
    document.querySelector('#compose-body').value = '';
}

function load_mailbox(mailbox) {
    // Show the mailbox and hide other views
    document.querySelector("#emails-view").style.display = "block";
    document.querySelector("#compose-view").style.display = "none";

    // Highlight the active mailbox button
    document.querySelectorAll('.btn').forEach(button => {
        button.classList.remove('active');
    });

    const mailboxButton = document.querySelector(`#${mailbox}`);
    if (mailboxButton) {
        mailboxButton.classList.add('active');
    }

    // Show the mailbox name and search bar
    document.querySelector("#emails-view").innerHTML = `
        <div class="d-flex justify-content-between align-items-center">
            <h3>${capitalizeFirstLetter(mailbox)}</h3>
        </div>
        <div id="emails-list"></div>`;

    // Fetch the emails
    fetch(`/emails/${mailbox}`)
        .then(response => response.json())
        .then(emails => {
            const emailsList = document.querySelector("#emails-list");
            emailsList.innerHTML = '';
            // Display each email
            emails.forEach(email => {
                const senderRecipients = mailbox !== "sent" ? email.sender : email.recipients;
                const isRead = mailbox === "inbox" && email.read ? "read" : "";
                const archived = mailbox === "archive";

                const item = document.createElement("div");
                item.className = `card ${isRead} my-1 items`;
                item.style.backgroundColor = isRead ? 'lightgray' : 'white';
                item.innerHTML = `
                    <div class="card-body d-flex justify-content-between align-items-center" id="item-${email.id}">
                        <div class="d-flex align-items-center">
                            <div class="circle">${email.sender.charAt(0).toUpperCase()}</div>
                            <div>
                                <h5 class="mb-0">${email.subject}</h5>
                                <p class="mb-0 text-muted">${senderRecipients}</p>
                            </div>
                        </div>
                        <div>
                            <p class="mb-0 text-muted">${email.timestamp}</p>
                            <button class="btn btn-sm btn-outline-primary reply-btn" onclick="reply_email(${email.id})">Reply</button>
                            ${mailbox !== "sent" ? `<button class="btn btn-sm btn-outline-secondary" onclick="toggle_archive(${email.id}, ${email.archived})">${email.archived ? 'Unarchive' : 'Archive'}</button>` : ''}
                        </div>
                    </div>
                    <p class="card-text">${email.body.slice(0, 100)}</p>`;
                emailsList.appendChild(item);
                item.addEventListener("click", () => show_mail(email.id, mailbox));
            });
        })
        .catch(error => {
            console.error('Error:', error);
            document.querySelector("#emails-view").innerHTML += `<p>Error loading emails: ${error.message}</p>`;
        });
}

function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

function send_email(event) {
    event.preventDefault();  // Prevent default form submission

    // Send the email
    fetch('/emails', {
        method: 'POST',
        body: JSON.stringify({
            recipients: document.querySelector('#compose-recipients').value,
            subject: document.querySelector('#compose-subject').value,
            body: document.querySelector('#compose-body').value
        })
    }).then(response => response.json())
      .then(result => {
          console.log(result);
          load_mailbox('sent');
      })
      .catch(error => {
          console.error('Error:', error);
          alert('Failed to send email');
      });
}

function reply_email(id) {
    compose_email();

    // Get the email details
    fetch(`/emails/${id}`)
        .then(response => response.json())
        .then(email => {
            // Set the recipient
            document.querySelector('#compose-recipients').value = email.sender;
            // Set the subject
            document.querySelector('#compose-subject').value = email.subject.startsWith('RE: ') ? email.subject : `RE: ${email.subject}`;
            // Set the body
            document.querySelector('#compose-body').value = `\n\n<hr>\n\nOn ${email.timestamp}, ${email.sender} wrote:\n${email.body}`;
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Failed to load email for reply');
        });
}

function show_mail(id, mailbox) {
    // Fetch the email details
    fetch(`/emails/${id}`)
        .then(response => response.json())
        .then(email => {
            // Clear the emails view and display the email details
            document.querySelector("#emails-view").innerHTML = `
                <div>
                    <h3>${email.subject}</h3>
                    <p><strong>From:</strong> ${email.sender}</p>
                    <p><strong>To:</strong> ${email.recipients.join(', ')}</p>
                    <p><strong>Timestamp:</strong> ${email.timestamp}</p>
                    <button class="btn btn-sm btn-outline-primary" onclick="reply_email(${email.id})">Reply</button>
                    <button class="btn btn-sm btn-outline-secondary" onclick="toggle_archive(${email.id}, ${email.archived})">${email.archived ? 'Unarchive' : 'Archive'}</button>
                    <hr>
                    <p>${email.body}</p>
                </div>`;

            // Mark the email as read if it’s in the inbox
            if (mailbox === 'inbox' && !email.read) {
                fetch(`/emails/${id}`, {
                    method: 'PUT',
                    body: JSON.stringify({
                        read: true
                    })
                });
            }
        })
        .catch(error => {
            console.error('Error:', error);
            document.querySelector("#emails-view").innerHTML += `<p>Error loading email: ${error.message}</p>`;
        });
}

function toggle_archive(id, archived) {
    fetch(`/emails/${id}`, {
        method: 'PUT',
        body: JSON.stringify({
            archived: !archived
        })
    })
    .then(() => load_mailbox('inbox'))
    .catch(error => {
        console.error('Error:', error);
        alert('Failed to update email archive status');
    });
}

function search_emails(event) {
    event.preventDefault();

    const query = document.querySelector('#search-query').value.toLowerCase();

    fetch(`/emails/search/${query}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(emails => {
            const emailsList = document.querySelector("#emails-list");
            emailsList.innerHTML = '';
            emails.forEach(email => {
                const senderRecipients = email.sender;
                const isRead = email.read ? "read" : "";

                const item = document.createElement("div");
                item.className = `card ${isRead} my-1 items`;
                item.style.backgroundColor = isRead ? 'lightgray' : 'white';
                item.innerHTML = `
                    <div class="card-body" id="item-${email.id}">
                        <div class="d-flex justify-content-between align-items-center">
                            <div class="circle">${email.sender.charAt(0).toUpperCase()}</div>
                            <h3>${email.subject}</h3>
                        </div>
                        <p>${senderRecipients} | ${email.timestamp}</p>
                        <p>${email.body.slice(0, 100)}</p>
                        <button class="btn btn-sm btn-outline-primary reply-btn" onclick="reply_email(${email.id})">Reply</button>
                        <button class="btn btn-sm btn-outline-secondary" onclick="toggle_archive(${email.id}, ${email.archived})">${email.archived ? 'Unarchive' : 'Archive'}</button>
                    </div>`;
                emailsList.appendChild(item);
                item.addEventListener("click", () => show_mail(email.id, 'inbox'));
            });
        })
        .catch(error => {
            console.error('Error:', error);
            document.querySelector("#emails-view").innerHTML += `<p>Error loading emails: ${error.message}</p>`;
        });
}
