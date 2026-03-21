package com.devforge.orthoflow.Domain.service;

import com.devforge.orthoflow.Application.dto.response.UserGeneralDto;
import com.devforge.orthoflow.External.repository.UserRepository;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class MyUserDetailService implements UserDetailsService {


    private final UserRepository userRepository;

    public MyUserDetailService(UserRepository userRepository) {

        this.userRepository = userRepository;
    }


    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        com.devforge.orthoflow.Domain.entity.user.User userData = userRepository.findByUsername(username).orElse(null);
        if(userData==null) throw new UsernameNotFoundException("User Not Found");
        UserDetails user = User.builder()
                .username(userData.getUsername())
                .password(userData.getPassword())
                .build();
        return user;
    }
}
