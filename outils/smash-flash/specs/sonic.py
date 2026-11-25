SPEC = dict(
    name='Sonic', sheet='BattleSonic.gif', credit='Sonic Battle (SEGA) / SSF', region=(0, 150, 746, 660),
    extra_bg=[(251, 251, 251)], gap=1, sounds='Sonic', height=58,
    anims=dict(
        idle='1.0-1.1', walk='3.4-3.8', run=['5.21', '5.22', '5.23'], crouch=['6.1'], jumpSquat=['6.1'],
        jump='0.0-0.3', doubleJump='0.4-0.9', fall=['3.17', '3.18'], land=['6.1'],
        shield=['2.0'], dodge=['2.14'], roll='0.0-0.5', hurt=['3.16'], hurtAir=['3.15'], tumble='0.0-0.9',
        lie=['12.16'], getup=['6.1'], taunt=['0.10', '0.11', '0.12'], win=['1.8', '1.9'],
        jab=['5.0', '5.1', '5.2'], ftilt=['5.11', '5.12'], utilt=['7.0', '7.1'], dtilt=['6.8', '6.9'], dash=['5.20', '5.24'],
        fsmash=['5.3', '5.11', '5.12'], usmash=['7.0', '7.1', '7.2'], dsmash=['11.16', '11.17', '11.18'],
        nair=['9.15', '9.16'], fair=['9.9', '9.10'], uair=['11.5', '11.7'], dair=['6.12', '6.13'],
        neutralB='0.0-0.9', sideB=['11.16', '11.17', '11.18'], upB=['7.0', '7.2', '0.0'], downB='0.0-0.5',
        grab=['5.0', '5.2'],
    ),
    times=dict(idle=14, walk=6, run=4, jump=3, doubleJump=3, roll=3, tumble=3, neutralB=3, downB=2, sideB=4, upB=[6, 6, 12]),
    moves=dict(neutralB=dict(vx=6, hit=dict(dmg=8)), sideB=dict(vx=7, hit=dict(dmg=9)), upB=dict(vy=-10, helpless=True),
               downB=dict(vx=8, hit=dict(dmg=10))),
    stats=dict(weight=88, walkSpeed=1.8, runSpeed=4.2, jumpForce=8.8, doubleJumpForce=8.0),
)
