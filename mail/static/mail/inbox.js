document.addEventListener('DOMContentLoaded', function() {
    // Use buttons to toggle between views
    document.querySelector('#inbox').addEventListener('click', () => load_mailbox('inbox'));
    document.querySelector('#sent').addEventListener('click', () => load_mailbox('sent'));
    document.querySelector('#archived').addEventListener('click', () => load_mailbox('archive'));
    document.querySelector('#compose').addEventListener('click', () => compose_email());
    document.querySelector('#compose-form').addEventListener('submit', send_email);

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
    document.querySelectorAll('.mailbox-btn').forEach(button => {
        button.classList.remove('active');
    });
    document.querySelector(`#${mailbox}`).classList.add('active');

    // Show the mailbox name
    document.querySelector("#emails-view").innerHTML = `<h3>${capitalizeFirstLetter(mailbox)}</h3>`;

    // Fetch the emails
    fetch(`/emails/${mailbox}`)
        .then(response => response.json())
        .then(emails => {
            // Clear previous emails
            document.querySelector("#emails-view").innerHTML += '<div id="emails-list"></div>';
            const emailsList = document.querySelector("#emails-list");

            // Display each email
            emails.forEach(email => {
                const senderRecipients = mailbox !== "sent" ? email.sender : email.recipients;
                const isRead = mailbox === "inbox" && email.read ? "read" : "";

                const item = document.createElement("div");
                item.className = `card ${isRead} my-1 items`;
                item.innerHTML = `
                    <div class="card-body" id="item-${email.id}">
                        <h3>${email.subject}</h3>
                        <p>${senderRecipients} | ${email.timestamp}</p>
                        <p>${email.body.slice(0, 100)}</p>
                        <button class="btn btn-sm btn-outline-primary reply-btn" onclick="reply_email(${email.id})">Reply</button>
                    </div>`;
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

function reply_email(id){
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
            document.querySelector('#compose-body').value = `On ${email.timestamp}, ${email.sender} wrote:\n${email.body}`;
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Failed to load email for reply');
        });
}
