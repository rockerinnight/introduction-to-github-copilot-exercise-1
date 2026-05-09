document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";
      activitySelect.innerHTML = "";

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;
        const participants = Array.isArray(details.participants) ? details.participants : [];

        const title = document.createElement("h4");
        title.textContent = name;

        const description = document.createElement("p");
        description.textContent = details.description;

        const schedule = document.createElement("p");
        const scheduleStrong = document.createElement("strong");
        scheduleStrong.textContent = "Schedule:";
        schedule.append(scheduleStrong, ` ${details.schedule}`);

        const availability = document.createElement("p");
        const availabilityStrong = document.createElement("strong");
        availabilityStrong.textContent = "Availability:";
        availability.append(availabilityStrong, ` ${spotsLeft} spots left`);

        const participantsSection = document.createElement("div");
        participantsSection.className = "participants-section";

        const participantsTitle = document.createElement("p");
        participantsTitle.className = "participants-title";
        const participantsStrong = document.createElement("strong");
        participantsStrong.textContent = `Participants (${participants.length})`;
        participantsTitle.appendChild(participantsStrong);

        const participantsList = document.createElement("ul");
        participantsList.className = "participants-list";

        if (participants.length) {
          participants.forEach((participant) => {
            const participantItem = document.createElement("li");

            const participantEmail = document.createElement("span");
            participantEmail.className = "participant-email";
            participantEmail.textContent = participant;

            const deleteBtn = document.createElement("button");
            deleteBtn.className = "delete-btn";
            deleteBtn.dataset.activity = name;
            deleteBtn.dataset.email = participant;
            deleteBtn.title = "Unregister";
            deleteBtn.setAttribute(
              "aria-label",
              `Unregister ${participant} from ${name}`
            );
            deleteBtn.textContent = "🗑︎";

            participantItem.append(participantEmail, deleteBtn);
            participantsList.appendChild(participantItem);
          });
        } else {
          const emptyParticipants = document.createElement("li");
          emptyParticipants.className = "empty-participants";
          emptyParticipants.textContent = "No participants yet";
          participantsList.appendChild(emptyParticipants);
        }

        participantsSection.append(participantsTitle, participantsList);
        activityCard.append(title, description, schedule, availability, participantsSection);

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Handle unregister (delete) button clicks
  activitiesList.addEventListener("click", async (event) => {
    const btn = event.target.closest(".delete-btn");
    if (!btn) return;

    const activity = btn.dataset.activity;
    const email = btn.dataset.email;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/unregister?email=${encodeURIComponent(email)}`,
        { method: "DELETE" }
      );

      if (response.ok) {
        await fetchActivities();
      } else {
        const result = await response.json();
        alert(result.detail || "Failed to unregister participant.");
      }
    } catch (error) {
      console.error("Error unregistering participant:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
