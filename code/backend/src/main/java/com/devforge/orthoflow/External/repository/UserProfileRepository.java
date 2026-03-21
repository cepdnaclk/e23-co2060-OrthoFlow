package com.devforge.orthoflow.External.repository;

import com.devforge.orthoflow.Domain.entity.user.UserProfile;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserProfileRepository extends JpaRepository<UserProfile, Long> {
}
